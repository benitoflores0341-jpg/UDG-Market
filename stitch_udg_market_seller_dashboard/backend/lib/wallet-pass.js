const crypto = require('node:crypto');

// Deriva un token opaco y estable por pase sin guardar el token original en la base.
function createQrToken(orderId, serialNumber, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`udg-market-wallet-pass:${orderId}:${serialNumber}`)
    .digest('base64url');
}

module.exports = { createQrToken };
