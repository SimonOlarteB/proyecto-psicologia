import mysql from "mysql2/promise";
import { opcionesMysql } from "./mysql-config.mjs";

const connection = await mysql.createConnection(
  opcionesMysql()
);

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