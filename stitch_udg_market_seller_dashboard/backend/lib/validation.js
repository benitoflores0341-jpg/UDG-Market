const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAG_TYPES = new Set(['allergen', 'diet']);

// Reconoce números y cadenas numéricas no vacías antes de convertirlas.
function isNumericInput(value) {
  return typeof value === 'number' ||
    (typeof value === 'string' && value.trim().length > 0);
}

// Comprueba que un texto tenga contenido y no exceda el límite indicado.
function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

// Convierte un ID positivo y seguro o devuelve null si el formato no es válido.
function parseId(value) {
  if (!isNumericInput(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Normaliza precios positivos a dos decimales y rechaza valores fuera de rango.
function parsePrice(value) {
  if (!isNumericInput(value)) return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price <= 99999999.99
    ? Math.round(price * 100) / 100
    : null;
}

// Acepta cantidades enteras positivas dentro del límite de negocio.
function parseQuantity(value) {
  if (!isNumericInput(value)) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 10000
    ? quantity
    : null;
}

// Valida etiquetas de dieta/alérgenos, elimina duplicados y conserva su tipo.
function parseTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30) return null;

  const tags = [];
  const seen = new Set();
  for (const tag of value) {
    if (
      !tag ||
      typeof tag !== 'object' ||
      !TAG_TYPES.has(tag.type) ||
      !isNonEmptyString(tag.name, 60)
    ) {
      return null;
    }
    const name = tag.name.trim();
    const key = `${tag.type}:${name.toLocaleLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      tags.push({ name, type: tag.type });
    }
  }
  return tags;
}

// Normaliza el correo para que las búsquedas y restricciones sean consistentes.
function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Convierte texto opcional vacío o inválido en null para persistencia.
function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

module.exports = {
  EMAIL_PATTERN,
  isNumericInput,
  isNonEmptyString,
  normalizeEmail,
  normalizeOptionalString,
  parseId,
  parsePrice,
  parseQuantity,
  parseTags
};
