import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionDeImagen(tipo: string): string | null {
  return TIPOS_PERMITIDOS[tipo] || null;
}

export function directorioUploads(): string {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }

  return path.join(process.cwd(), "public", "uploads");
}

export async function guardarImagenSubida(
  carpeta: "logo" | "perfil" | "blog" | "trayectoria",
  archivo: File
): Promise<{ url: string }> {
  const extension = extensionDeImagen(archivo.type);

  if (!extension) {
    throw new Error("FORMATO_INVALIDO");
  }

  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
  const destino = path.join(directorioUploads(), carpeta);

  await mkdir(destino, { recursive: true });
  await writeFile(
    path.join(destino, nombreArchivo),
    Buffer.from(await archivo.arrayBuffer())
  );

  return {
    url: `/uploads/${carpeta}/${nombreArchivo}`,
  };
}
