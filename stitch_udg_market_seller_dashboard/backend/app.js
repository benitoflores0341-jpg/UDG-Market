const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');
const { pool } = require('./db');
const MySqlSessionStore = require('./session-store');
const { requireJson } = require('./middleware/auth');
const { errorHandler, notFound } = require('./middleware/errors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const walletRoutes = require('./routes/wallet');
const uploadRoutes = require('./routes/uploads');

const projectRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');
const imagesRoot = path.join(projectRoot, 'imagenes');
// Crea la carpeta donde multer guarda imágenes de productos y avatares.
fs.mkdirSync(imagesRoot, { recursive: true });

// Prepara seguridad HTTP, límites de solicitudes y sesiones persistidas en MySQL.
const app = express();
if (config.nodeEnv === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

const sessionStore = new MySqlSessionStore({ maxAgeMs: config.sessionMaxAgeMs });
app.locals.sessionStore = sessionStore;

app.use(session({
  name: 'udgmarket.sid',
  secret: config.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: config.sessionMaxAgeMs
  }
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' }
});

// Verifica que tanto las tablas de usuarios como las de sesiones estén accesibles.
app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1 FROM users LIMIT 0');
  await pool.query('SELECT 1 FROM sessions LIMIT 0');
  res.json({ status: 'ok', database: 'connected' });
});

// Limita las escrituras API a JSON, salvo las cargas multipart de imágenes.
app.use('/api', apiLimiter, (req, res, next) => {
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    req.path !== '/uploads/images'
  ) {
    return requireJson(req, res, next);
  }
  next();
});

// Agrupa autenticación, perfil, catálogo, pedidos, reseñas, QR e imágenes.
app.use('/api/auth', (req, res, next) => {
  if (req.method === 'POST' && ['/login', '/register'].includes(req.path)) {
    return authLimiter(req, res, next);
  }
  next();
}, authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/uploads', uploadRoutes);

// Publica las imágenes con controles para evitar archivos ocultos o tipos confusos.
app.use('/imagenes', express.static(imagesRoot, {
  dotfiles: 'deny',
  index: false,
  fallthrough: false,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// El dashboard requiere una sesión activa; los demás recursos estáticos se sirven desde /app.
app.get('/app/dashboard.html', (req, res) => {
  if (!req.session.user) return res.redirect('/app/login.html');
  res.sendFile(path.join(publicRoot, 'dashboard.html'));
});
app.use('/app', express.static(publicRoot, {
  dotfiles: 'deny',
  index: false,
  fallthrough: true
}));

const modulePages = {
  catalog: 'buyer_catalog/code.html',
  inventory: 'inventario.html',
  'seller-orders': 'udg_market_gesti_n_de_pedidos_activos_vendedor/code.html',
  'buyer-orders': 'pedidos.html_con_modal_cancelar_reserva/code.html',
  'edit-product': 'udg_market_editar_informaci_n_del_producto/code.html',
  'seller-profile': 'udg_market_perfil_del_vendedor_y_rese_as/code.html',
  'my-profile': 'udg_market_mi_perfil_con_modal_de_edici_n/code.html',
  settings: 'udg_market_mi_perfil_y_ajustes/code.html',
  'delivery-pass': 'udg_market_mis_pedidos_con_pase_de_entrega_apple_wallet/code.html',
  'post-delivery-review': 'udg_market_mis_pedidos_con_valoraci_n_de_compra_post_entrega/code.html',
  'cancel-reservation': 'udg_market_cancelar_reserva_ios_sheet_modal/code.html',
  'inventory-stock': 'udg_market_inventario_y_gesti_n_de_stock_vendedor_1/code.html',
  'inventory-stock-alt': 'udg_market_inventario_y_gesti_n_de_stock_vendedor_2/code.html'
};
// Define qué pantallas HTML se cargan dentro del iframe principal de la aplicación.
const sellerOnlyModules = new Set([
  'inventory',
  'seller-orders',
  'edit-product',
  'inventory-stock',
  'inventory-stock-alt'
]);

// Entrega al iframe el helper de autenticación solo cuando existe una sesión.
app.get('/modulos/auth.js', (req, res) => {
  if (!req.session.user) return res.status(401).type('text').send('');
  res.sendFile(path.join(publicRoot, 'assets', 'module-auth.js'));
});

// Resuelve las pantallas del dashboard y bloquea módulos exclusivos de vendedor.
app.get('/modulos/:module', (req, res, next) => {
  if (!req.session.user) return res.redirect('/app/login.html');
  const relativePath = modulePages[req.params.module];
  if (sellerOnlyModules.has(req.params.module) &&
      !['seller', 'both', 'admin'].includes(req.session.user.role)) {
    return res.redirect('/app/dashboard.html#buyer-orders');
  }
  if (!relativePath && ['index.html', 'producto.html'].includes(req.params.module)) {
    return res.redirect('/app/dashboard.html');
  }
  if (!relativePath) return next();
  res.sendFile(path.resolve(projectRoot, relativePath), (error) => {
    if (error) next(error);
  });
});

// Redirige las rutas cortas a la pantalla de acceso o al dashboard correspondiente.
app.get('/', (req, res) => {
  res.redirect(req.session.user ? '/app/dashboard.html' : '/app/login.html');
});
app.get('/login', (req, res) => res.redirect('/app/login.html'));
app.get('/registro', (req, res) => res.redirect('/app/registro.html'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
