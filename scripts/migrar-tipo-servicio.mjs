import mysql from "mysql2/promise";
import { opcionesMysql } from "./mysql-config.mjs";

const connection = await mysql.createConnection(
  opcionesMysql()
);

try {
  const [columnas] = await connection.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'servicios'
      AND COLUMN_NAME = 'tipo_servicio'
    `
  );

  if (columnas.length === 0) {
    await connection.query(
      `
      ALTER TABLE servicios
      ADD COLUMN tipo_servicio
        ENUM('NORMAL', 'ESPECIAL')
        NOT NULL DEFAULT 'NORMAL'
        AFTER descripcion
      `
    );

    console.log("Columna tipo_servicio creada.");
  } else {
    console.log("La columna tipo_servicio ya existe.");
  }
} finally {
  await connection.end();
}