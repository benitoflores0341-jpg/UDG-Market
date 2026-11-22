const session = require('express-session');
const { pool } = require('./db');

// Adapta la tabla MySQL `sessions` a la interfaz de almacenamiento de express-session.
class MySqlSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.maxAgeMs = options.maxAgeMs || 1000 * 60 * 60 * 24 * 7;
    // Limpia periódicamente sesiones vencidas sin mantener vivo el proceso.
    this.cleanupInterval = setInterval(
      () => this.clearExpired().catch((error) => console.error('Error limpiando sesiones:', error)),
      options.cleanupIntervalMs || 15 * 60 * 1000
    );
    this.cleanupInterval.unref();
  }

  // Convierte la expiración de la cookie a segundos UNIX para guardarla en MySQL.
  expirationTime(sessionData) {
    const cookieExpiry = sessionData.cookie && sessionData.cookie.expires;
    const expiresAt = cookieExpiry ? new Date(cookieExpiry).getTime() : Date.now() + this.maxAgeMs;
    return Math.ceil(expiresAt / 1000);
  }

  // Recupera una sesión vigente y elimina de la tabla cualquier registro expirado.
  get(sessionId, callback) {
    pool.execute(
      'SELECT data, expires FROM sessions WHERE session_id = ? LIMIT 1',
      [sessionId]
    ).then(async ([rows]) => {
      if (!rows.length) return callback(null, null);
      if (rows[0].expires <= Math.floor(Date.now() / 1000)) {
        await this.destroy(sessionId, () => {});
        return callback(null, null);
      }
      try {
        callback(null, JSON.parse(rows[0].data));
      } catch (error) {
        callback(error);
      }
    }).catch(callback);
  }

  // Inserta o reemplaza la sesión serializada junto con su fecha de expiración.
  set(sessionId, sessionData, callback = () => {}) {
    const expires = this.expirationTime(sessionData);
    pool.execute(
      `INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
      [sessionId, expires, JSON.stringify(sessionData)]
    ).then(() => callback(null)).catch(callback);
  }

  // Extiende la expiración de una sesión activa sin reescribir sus datos.
  touch(sessionId, sessionData, callback = () => {}) {
    pool.execute(
      'UPDATE sessions SET expires = ? WHERE session_id = ?',
      [this.expirationTime(sessionData), sessionId]
    ).then(() => callback(null)).catch(callback);
  }

  // Elimina una sesión cuando el usuario cierra sesión o la aplicación la invalida.
  destroy(sessionId, callback = () => {}) {
    pool.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId])
      .then(() => callback(null)).catch(callback);
  }

  // Borra todas las sesiones vencidas en una sola consulta.
  async clearExpired() {
    await pool.execute('DELETE FROM sessions WHERE expires <= ?', [Math.floor(Date.now() / 1000)]);
  }

  // Detiene el temporizador de limpieza al cerrar el servidor.
  close() {
    clearInterval(this.cleanupInterval);
  }
}

module.exports = MySqlSessionStore;
