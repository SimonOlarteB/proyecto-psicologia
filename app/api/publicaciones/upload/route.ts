import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verificarSesion } from "../../../lib/auth";
import { guardarImagenSubida } from "../../../lib/uploads";

export const runtime = "nodejs";

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAXIMO_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (!token || !verificarSesion(token)) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const archivo = formData.get("file");

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ninguna imagen." },
        { status: 400 }
      );
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json(
        { error: "Solo puedes subir imágenes JPG, PNG o WEBP." },
        { status: 400 }
      );
    }

    if (archivo.size > MAXIMO_BYTES) {
      return NextResponse.json(
        { error: "La imagen no puede superar los 5 MB." },
        { status: 400 }
      );
    }

    const { url } = await guardarImagenSubida("blog", archivo);

    return NextResponse.json({
      ok: true,
      url,
    });
  } catch (error) {
    console.error("Error subiendo imagen del Blog:", error);

    return NextResponse.json(
      { error: "No se pudo guardar la imagen." },
      { status: 500 }
    );
  }
}