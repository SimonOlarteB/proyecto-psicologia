import mysql from "mysql2/promise";
import crypto from "crypto";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function preguntar(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

function generarHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

async function restablecerAdministrador() {
  let conexion;

  try {
    console.log("\n=== RESTABLECER CONTRASEÑA ===\n");

    const email = (
      await preguntar("Correo del administrador: ")
    )
      .trim()
      .toLowerCase();

    const password = await preguntar(
      "Nueva contraseña: "
    );

    if (!email || !password) {
      throw new Error(
        "El correo y la contraseña son obligatorios."
      );
    }

    if (password.length < 8) {
      throw new Error(
        "La contraseña debe tener mínimo 8 caracteres."
      );
    }

    conexion = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database: "psicologia",
    });

    const [filas] = await conexion.execute(
      `
      SELECT id, nombre, email
      FROM administradores
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    const administradores = filas;

    if (administradores.length === 0) {
      throw new Error(
        "No existe un administrador con ese correo."
      );
    }

    const passwordHash = generarHash(password);

    await conexion.execute(
      `
      UPDATE administradores
      SET password = ?,
          debe_cambiar_password = 0
      WHERE email = ?
      `,
      [passwordHash, email]
    );

    console.log(
      "\n✅ Contraseña restablecida correctamente."
    );
    console.log(`Administrador: ${administradores[0].nombre}`);
    console.log(`Correo: ${administradores[0].email}`);
    console.log(
      "Ya puedes iniciar sesión con la nueva contraseña.\n"
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    if (conexion) {
      await conexion.end();
    }

    rl.close();
  }
}

restablecerAdministrador();