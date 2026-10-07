import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "../../../lib/db";

function verificarPassword(password: string, passwordGuardada: string) {
    const partes = passwordGuardada.split(":");

    if (partes.length !== 2) {
        return false;
    }

    const [salt, hashGuardado] = partes;

    try {
        const hashCalculado = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        const hashGuardadoBuffer = Buffer.from(hashGuardado, "hex");
        const hashCalculadoBuffer = Buffer.from(hashCalculado, "hex");

        if (
            hashGuardadoBuffer.length !== hashCalculadoBuffer.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            hashGuardadoBuffer,
            hashCalculadoBuffer
        );
    } catch {
        return false;
    }
}

function crearTokenSesion(id: number, debeCambiarPassword: boolean) {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET no está configurado.");
    }

    const payload = {
        id,
        debeCambiarPassword,
        exp: Date.now() + 8 * 60 * 60 * 1000,
    };

    const contenido = Buffer.from(
        JSON.stringify(payload)
    ).toString("base64url");

    const firma = crypto
        .createHmac("sha256", secret)
        .update(contenido)
        .digest("base64url");

    return `${contenido}.${firma}`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const email = String(body.email || "")
            .trim()
            .toLowerCase();

        const password = String(body.password || "");

        if (!email || !password) {
            return NextResponse.json(
                {
                    error: "Correo y contraseña son obligatorios.",
                },
                { status: 400 }
            );
        }

        const [filas] = await pool.query(
            `
            SELECT
                id,
                nombre,
                email,
                password,
                debe_cambiar_password
            FROM administradores
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        const administradores = filas as any[];

        if (administradores.length === 0) {
            return NextResponse.json(
                {
                    error: "Correo o contraseña incorrectos.",
                },
                { status: 401 }
            );
        }

        const administrador = administradores[0];

        const passwordCorrecta = verificarPassword(
            password,
            administrador.password
        );

        if (!passwordCorrecta) {
            return NextResponse.json(
                {
                    error: "Correo o contraseña incorrectos.",
                },
                { status: 401 }
            );
        }

        const debeCambiarPassword =
            Number(administrador.debe_cambiar_password) === 1;

        const token = crearTokenSesion(
            administrador.id,
            debeCambiarPassword
        );

        const respuesta = NextResponse.json({
            ok: true,
            nombre: administrador.nombre,
            debeCambiarPassword,
        });

        respuesta.cookies.set({
            name: "admin_session",
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 8 * 60 * 60,
            path: "/",
        });

        return respuesta;
    } catch (error) {
        console.error("Error en login:", error);

        return NextResponse.json(
            {
                error: "No fue posible iniciar sesión.",
            },
            { status: 500 }
        );
    }
}