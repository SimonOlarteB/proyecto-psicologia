import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "psicologia",
});

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