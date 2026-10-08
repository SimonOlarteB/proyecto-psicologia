// Respaldo de la base de datos con mysqldump.
//
// Uso:
//   node scripts/respaldo-mysql.mjs [destino]
//
// El destino por defecto es ./respaldos. Genera un
// archivo psicologia-<fecha>.sql.gz comprimido.
//
// Requiere mysqldump en el PATH y las mismas
// variables DB_* que la app (lee .env si existe).

import { spawn } from "child_process";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { createGzip } from "zlib";
import { resolve } from "path";
import { opcionesMysql, validarConfiguracionMysql } from "./mysql-config.mjs";

validarConfiguracionMysql();

const opciones = opcionesMysql();

const destino = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(process.cwd(), "respaldos");

if (!existsSync(destino)) {
  mkdirSync(destino, { recursive: true });
}

const marca = new Date()
  .toISOString()
  .slice(0, 19)
  .replace(/[:T]/g, "-");

const archivo = resolve(destino, `psicologia-${marca}.sql.gz`);

const argumentos = [
  `--host=${opciones.host}`,
  `--port=${opciones.port}`,
  `--user=${opciones.user}`,
  "--single-transaction",
  "--routines",
  "--triggers",
  "--default-character-set=utf8mb4",
  opciones.database,
];

// La contraseña viaja por variable de entorno,
// no por la línea de comandos.
const entorno = {
  ...process.env,
  MYSQL_PWD: opciones.password || "",
};

const volcado = spawn("mysqldump", argumentos, { env: entorno });
const compresor = createGzip();
const salida = createWriteStream(archivo);

volcado.stdout.pipe(compresor).pipe(salida);

volcado.stderr.on("data", (datos) => {
  console.error(`mysqldump: ${datos}`);
});

volcado.on("error", (error) => {
  console.error("No fue posible ejecutar mysqldump:", error.message);
  process.exit(1);
});

salida.on("error", (error) => {
  console.error("No fue posible escribir el respaldo:", error.message);
  process.exit(1);
});

volcado.on("close", (codigo) => {
  if (codigo !== 0) {
    console.error(`mysqldump terminó con código ${codigo}.`);
    process.exit(codigo);
  }

  console.log(`✅ Respaldo creado: ${archivo}`);
});
