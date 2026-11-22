// Exige una sesión autenticada antes de permitir que continúe la solicitud.
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  }
  next();
}

// Exige sesión y un rol con permisos de vendedor o administrador.
function requireSeller(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  }
  if (!['seller', 'both', 'admin'].includes(req.session.user.role)) {
    return res.status(403).json({ error: 'Esta acción requiere una cuenta de vendedor.' });
  }
  next();
}

// Valida que el endpoint reciba JSON; las rutas multipart no montan este middleware.
function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Envía el contenido como application/json.' });
  }
  next();
}

module.exports = { requireAuth, requireJson, requireSeller };
