const mysql = require('mysql2/promise');
const config = require('./config');

// Comparte conexiones para que las rutas no abran una conexión por cada consulta.
const pool = mysql.createPool(config.database);

// Ejecuta varias escrituras como una sola operación atómica y revierte si algo falla.
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { pool, withTransaction };
