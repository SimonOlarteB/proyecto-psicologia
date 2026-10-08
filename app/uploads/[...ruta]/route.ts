import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { directorioUploads } from "../../lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CARPETAS_PERMITIDAS = new Set([
  "logo",
  "perfil",
  "blog",
  "trayectoria",
]);

const TIPOS_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ruta: string[] }> }
) {
  const { ruta } = await params;

  if (
    ruta.length !== 2 ||
    !CARPETAS_PERMITIDAS.has(ruta[0]) ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.(jpg|png|webp)$/i.test(
      ruta[1]
    )
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const directorio = path.resolve(directorioUploads());
  const archivo = path.resolve(directorio, ...ruta);
  const relativo = path.relative(directorio, archivo);

  if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const contenido = await readFile(archivo);
    const extension = path.extname(archivo).slice(1).toLowerCase();

    return new NextResponse(new Uint8Array(contenido), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": TIPOS_POR_EXTENSION[extension],
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}