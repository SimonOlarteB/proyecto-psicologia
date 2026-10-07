import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "psicologia",
});

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bloqueos_agenda (
      id INT NOT NULL AUTO_INCREMENT,
      inicio DATETIME NOT NULL,
      fin DATETIME NOT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_bloqueos_agenda_activo_intervalo (activo, inicio, fin)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log("Tabla bloqueos_agenda lista.");
} finally {
  await connection.end();
}