import crypto from "crypto";

// Cifrado AES-256-GCM para datos sensibles en reposo
// (refresh_token de Google). La clave se deriva de
// TOKEN_ENCRYPTION_KEY; si no existe, de AUTH_SECRET.
const PREFIJO = "enc:v1:";

function claveDeCifrado(): Buffer {
  const secreto =
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET;

  if (!secreto) {
    throw new Error(
      "Falta TOKEN_ENCRYPTION_KEY o AUTH_SECRET para cifrar tokens."
    );
  }

  // SHA-256 del secreto → clave de 32 bytes para AES-256.
  return crypto
    .createHash("sha256")
    .update(secreto)
    .digest();
}

export function cifrarToken(valor: string): string {
  const clave = claveDeCifrado();
  const iv = crypto.randomBytes(12);

  const cifrador = crypto.createCipheriv(
    "aes-256-gcm",
    clave,
    iv
  );

  const cifrado = Buffer.concat([
    cifrador.update(valor, "utf8"),
    cifrador.final(),
  ]);

  const etiqueta = cifrador.getAuthTag();

  return `${PREFIJO}${iv.toString("hex")}:${etiqueta.toString("hex")}:${cifrado.toString("hex")}`;
}

export function descifrarToken(valor: string): string {
  // Compatibilidad con tokens guardados antes del cifrado.
  if (!valor.startsWith(PREFIJO)) {
    return valor;
  }

  const clave = claveDeCifrado();
  const [, ivHex, etiquetaHex, cifradoHex] =
    valor.split(":");

  if (!ivHex || !etiquetaHex || !cifradoHex) {
    throw new Error(
      "Token cifrado con formato inválido."
    );
  }

  const iv = Buffer.from(ivHex, "hex");
  const etiqueta = Buffer.from(etiquetaHex, "hex");
  const cifrado = Buffer.from(cifradoHex, "hex");

  const descifrador = crypto.createDecipheriv(
    "aes-256-gcm",
    clave,
    iv
  );

  descifrador.setAuthTag(etiqueta);

  return Buffer.concat([
    descifrador.update(cifrado),
    descifrador.final(),
  ]).toString("utf8");
}
