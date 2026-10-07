import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

import { verificarSesion } from "../../../lib/auth";

export const runtime = "nodejs";

const TIPOS_PERMITIDOS = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const MAXIMO_MB = 5;
const MAXIMO_BYTES = MAXIMO_MB * 1024 * 1024;

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session")?.value;

        if (!token || !verificarSesion(token)) {
            return NextResponse.json(
                {
                    error: "No autorizado.",
                },
                {
                    status: 401,
                }
            );
        }

        const formData = await request.formData();
        const archivo = formData.get("file");

        if (!(archivo instanceof File)) {
            return NextResponse.json(
                {
                    error: "No se recibió ninguna imagen.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
            return NextResponse.json(
                {
                    error:
                        "Formato no válido. Solo se permiten JPG, PNG o WEBP.",
                },
                {
                    status: 400,
                }
            );
        }

        if (archivo.size > MAXIMO_BYTES) {
            return NextResponse.json(
                {
                    error: `La imagen no puede superar los ${MAXIMO_MB} MB.`,
                },
                {
                    status: 400,
                }
            );
        }

        const extensiones: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };

        const extension = extensiones[archivo.type];

        const nombreArchivo =
            `${crypto.randomUUID()}.${extension}`;

        const carpeta = path.join(
            process.cwd(),
            "public",
            "uploads",
            "perfil"
        );

        await mkdir(carpeta, {
            recursive: true,
        });

        const bytes = await archivo.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const rutaArchivo = path.join(
            carpeta,
            nombreArchivo
        );

        await writeFile(
            rutaArchivo,
            buffer
        );

        const url =
            `/uploads/perfil/${nombreArchivo}`;

        return NextResponse.json({
            ok: true,
            url,
        });
    } catch (error) {
        console.error(
            "Error subiendo fotografía del perfil:",
            error
        );

        return NextResponse.json(
            {
                error: "No se pudo guardar la fotografía.",
            },
            {
                status: 500,
            }
        );
    }
}