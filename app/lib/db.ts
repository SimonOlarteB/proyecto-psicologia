import mysql from "mysql2/promise";
import { readFileSync } from "fs";

function sslDelEntorno(): mysql.SslOptions | undefined {
  const ssl = process.env.DB_SSL;
  if (ssl !== "true" && ssl !== "1") {
    return undefined;
  }

  const opciones: mysql.SslOptions = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };

  // CA del proveedor MySQL gestionado (RDS, PlanetScale, etc.).
  if (process.env.DB_SSL_CA) {
    opciones.ca = readFileSync(process.env.DB_SSL_CA);
  }

  return opciones;
}

function opcionesPool(): mysql.PoolOptions {
  const produccion = process.env.NODE_ENV === "production";
  const enBuild = process.env.NEXT_PHASE === "phase-production-build";
  const host = process.env.DB_HOST || "127.0.0.1";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME || "psicologia";
  const port = Number(process.env.DB_PORT || 3306);

  if (produccion && !enBuild) {
    const faltantes: string[] = [];

    if (!process.env.DB_HOST) faltantes.push("DB_HOST");
    if (!process.env.DB_USER) faltantes.push("DB_USER");
    if (process.env.DB_PASSWORD === undefined) faltantes.push("DB_PASSWORD");
    if (!process.env.DB_NAME) faltantes.push("DB_NAME");

    if (faltantes.length > 0) {
      throw new Error(
        `Faltan variables de base de datos en producción: ${faltantes.join(", ")}.`
      );
    }

    if (user === "root") {
      throw new Error(
        "DB_USER=root no es adecuado en producción. Crea un usuario de aplicación con privilegios mínimos."
      );
    }
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    ssl: sslDelEntorno(),
    timezone: "Z",
  };
}

let pool: mysql.Pool | null = null;

function obtenerPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(opcionesPool());
  }

  return pool;
}

const poolProxy = new Proxy({} as mysql.Pool, {
  get(_objetivo, propiedad) {
    const instancia = obtenerPool() as unknown as Record<
      PropertyKey,
      unknown
    >;
    const valor = instancia[propiedad];
    return typeof valor === "function" ? valor.bind(instancia) : valor;
  },
});

export default poolProxy;
