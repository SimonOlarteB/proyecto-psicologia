import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { verificarSesion } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session")?.value;

        if (!verificarSesion(token)) {
            return NextResponse.json(
                { error: "No autorizado." },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const archivo = formData.get("file");

        if (!(archivo instanceof File)) {
            return NextResponse.json(
                { error: "No se recibió ningún archivo." },
                { status: 400 }
            );
        }

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!tiposPermitidos.includes(archivo.type)) {
            return NextResponse.json(
                {
                    error:
                        "Solo puedes subir imágenes JPG, PNG o WEBP.",
                },
                { status: 400 }
            );
        }

        const maximo = 5 * 1024 * 1024;

        if (archivo.size > maximo) {
            return NextResponse.json(
                {
                    error: "El logo no puede superar los 5 MB.",
                },
                { status: 400 }
            );
        }

        const extensiones: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };

        const extension = extensiones[archivo.type];

        const nombreArchivo = `${crypto.randomUUID()}.${extension}`;

        const carpeta = path.join(
            process.cwd(),
            "public",
            "uploads",
            "logo"
        );

        await mkdir(carpeta, { recursive: true });

        const rutaArchivo = path.join(
            carpeta,
            nombreArchivo
        );

        const bytes = await archivo.arrayBuffer();

        await writeFile(
            rutaArchivo,
            Buffer.from(bytes)
        );

        return NextResponse.json({
            ok: true,
            url: `/uploads/logo/${nombreArchivo}`,
        });
    } catch (error) {
        console.error(
            "Error subiendo logo:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "No se pudo subir el logo.",
            },
            { status: 500 }
        );
    }
}