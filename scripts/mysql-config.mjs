import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function cargarEnvLocal() {
  const ruta = resolve(process.cwd(), ".env");

  if (!existsSync(ruta)) {
    return;
  }

  const texto = readFileSync(ruta, "utf8");

  for (const linea of texto.split(/\r?\n/)) {
    const recorte = linea.trim();

    if (!recorte || recorte.startsWith("#")) {
      continue;
    }

    const separador = recorte.indexOf("=");

    if (separador <= 0) {
      continue;
    }

    const clave = recorte.slice(0, separador).trim();
    let valor = recorte.slice(separador + 1).trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (process.env[clave] === undefined) {
      process.env[clave] = valor;
    }
  }
}

cargarEnvLocal();

// Los scripts de ops usan las mismas variables que la app.
// En producción exigen configuración completa y rechazan root.
export function validarConfiguracionMysql() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const faltantes = [];

  if (!process.env.DB_HOST) faltantes.push("DB_HOST");
  if (!process.env.DB_USER) faltantes.push("DB_USER");
  if (process.env.DB_PASSWORD === undefined) {
    faltantes.push("DB_PASSWORD");
  }
  if (!process.env.DB_NAME) faltantes.push("DB_NAME");

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de base de datos en producción: ${faltantes.join(", ")}.`
    );
  }

  if (process.env.DB_USER === "root") {
    throw new Error(
      "DB_USER=root no es adecuado en producción. Usa un usuario con privilegios mínimos."
    );
  }
}

export function opcionesMysql() {
  const ssl =
    process.env.DB_SSL === "true" || process.env.DB_SSL === "1"
      ? {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
        }
      : undefined;

  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "psicologia",
    ssl,
  };
}
