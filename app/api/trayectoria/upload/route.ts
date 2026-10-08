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

const MAXIMO_MB = 5;
const MAXIMO_BYTES = MAXIMO_MB * 1024 * 1024;

export async function POST(request: Request) {
    try {
        // Verificar sesión del administrador
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

        // Validar formato
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

        // Validar tamaño
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

        const { url } = await guardarImagenSubida("trayectoria", archivo);

        return NextResponse.json({
            ok: true,
            url,
        });
    } catch (error) {
        console.error(
            "Error subiendo imagen de trayectoria:",
            error
        );

        return NextResponse.json(
            {
                error: "No se pudo guardar la imagen.",
            },
            {
                status: 500,
            }
        );
    }
}