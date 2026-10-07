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

async function crearAdministrador() {
  try {
    console.log("\n=== CREAR ADMINISTRADOR ===\n");

    const nombre = await preguntar("Nombre de la administradora: ");
    const email = await preguntar("Correo electrónico: ");
    const password = await preguntar("Contraseña: ");

    if (!nombre || !email || !password) {
      throw new Error("Todos los campos son obligatorios.");
    }

    if (password.length < 8) {
      throw new Error(
        "La contraseña debe tener mínimo 8 caracteres."
      );
    }

    const passwordHash = generarHash(password);

    const conexion = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "",
      database: "psicologia",
    });

    await conexion.execute(
      `
      INSERT INTO administradores
      (nombre, email, password)
      VALUES (?, ?, ?)
      `,
      [nombre, email, passwordHash]
    );

    await conexion.end();

    console.log("\n✅ Administradora creada correctamente.");
    console.log(`Correo: ${email}`);
    console.log("La contraseña fue almacenada de forma segura.\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    rl.close();
  }
}

crearAdministrador();