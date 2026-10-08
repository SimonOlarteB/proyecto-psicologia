import crypto from "crypto";

const PREFIJO = "enc:v1:";

function claveDerivada(): Buffer | null {
  const secreto =
    process.env.TOKEN_ENCRYPTION_KEY || process.env.AUTH_SECRET;

  if (!secreto) {
    return null;
  }

  return crypto.createHash("sha256").update(secreto).digest();
}

export function cifrarSecreto(valor: string): string {
  const clave = claveDerivada();

  if (!clave) {
    return valor;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", clave, iv);
  const cifrado = Buffer.concat([
    cipher.update(valor, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return (
    PREFIJO +
    Buffer.concat([iv, tag, cifrado]).toString("base64url")
  );
}

export function descifrarSecreto(valor: string): string {
  if (!valor.startsWith(PREFIJO)) {
    return valor;
  }

  const clave = claveDerivada();

  if (!clave) {
    throw new Error(
      "No hay AUTH_SECRET ni TOKEN_ENCRYPTION_KEY para leer el token cifrado."
    );
  }

  const raw = Buffer.from(valor.slice(PREFIJO.length), "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const cifrado = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", clave, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(cifrado),
    decipher.final(),
  ]).toString("utf8");
}
