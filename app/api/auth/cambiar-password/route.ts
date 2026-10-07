import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "../../../lib/db";

function verificarPassword(
    password: string,
    passwordGuardada: string
) {
    const partes = passwordGuardada.split(":");

    if (partes.length !== 2) {
        return false;
    }

    const [salt, hashGuardado] = partes;

    try {
        const hashCalculado = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        const hashGuardadoBuffer = Buffer.from(
            hashGuardado,
            "hex"
        );

        const hashCalculadoBuffer = Buffer.from(
            hashCalculado,
            "hex"
        );

        if (
            hashGuardadoBuffer.length !==
            hashCalculadoBuffer.length
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

function crearHashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;
}

function verificarSesion(token: string) {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET no está configurado.");
    }

    const partes = token.split(".");

    if (partes.length !== 2) {
        return null;
    }

    const [contenido, firma] = partes;

    const firmaEsperada = crypto
        .createHmac("sha256", secret)
        .update(contenido)
        .digest("base64url");

    const firmaBuffer = Buffer.from(firma, "utf8");
    const firmaEsperadaBuffer = Buffer.from(
        firmaEsperada,
        "utf8"
    );

    if (
        firmaBuffer.length !==
        firmaEsperadaBuffer.length
    ) {
        return null;
    }

    if (
        !crypto.timingSafeEqual(
            firmaBuffer,
            firmaEsperadaBuffer
        )
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(
            Buffer.from(contenido, "base64url").toString("utf8")
        );

        if (!payload.id || !payload.exp) {
            return null;
        }

        if (Date.now() > payload.exp) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

function crearTokenSesion(id: number) {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET no está configurado.");
    }

    const payload = {
        id,
        debeCambiarPassword: false,
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
        const token = request.cookies.get(
            "admin_session"
        )?.value;

        if (!token) {
            return NextResponse.json(
                {
                    error: "No tienes una sesión activa.",
                },
                { status: 401 }
            );
        }

        const sesion = verificarSesion(token);

        if (!sesion) {
            return NextResponse.json(
                {
                    error: "La sesión no es válida o ha expirado.",
                },
                { status: 401 }
            );
        }

        const body = await request.json();

        const passwordActual = String(
            body.passwordActual || ""
        );

        const nuevaPassword = String(
            body.nuevaPassword || ""
        );

        if (!passwordActual || !nuevaPassword) {
            return NextResponse.json(
                {
                    error: "Completa todos los campos.",
                },
                { status: 400 }
            );
        }

        if (nuevaPassword.length < 8) {
            return NextResponse.json(
                {
                    error:
                        "La nueva contraseña debe tener mínimo 8 caracteres.",
                },
                { status: 400 }
            );
        }

        const [filas] = await pool.query(
            `
            SELECT
                id,
                password,
                debe_cambiar_password
            FROM administradores
            WHERE id = ?
            LIMIT 1
            `,
            [sesion.id]
        );

        const administradores = filas as any[];

        if (administradores.length === 0) {
            return NextResponse.json(
                {
                    error: "Administrador no encontrado.",
                },
                { status: 404 }
            );
        }

        const administrador = administradores[0];

        const passwordCorrecta = verificarPassword(
            passwordActual,
            administrador.password
        );

        if (!passwordCorrecta) {
            return NextResponse.json(
                {
                    error: "La contraseña actual es incorrecta.",
                },
                { status: 401 }
            );
        }

        if (
            verificarPassword(
                nuevaPassword,
                administrador.password
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "La nueva contraseña debe ser diferente a la actual.",
                },
                { status: 400 }
            );
        }

        const nuevoHash = crearHashPassword(
            nuevaPassword
        );

        await pool.query(
            `
            UPDATE administradores
            SET
                password = ?,
                debe_cambiar_password = 0
            WHERE id = ?
            `,
            [nuevoHash, sesion.id]
        );

        const nuevoToken = crearTokenSesion(
            Number(administrador.id)
        );

        const respuesta = NextResponse.json({
            ok: true,
            mensaje:
                "Contraseña actualizada correctamente.",
        });

        respuesta.cookies.set({
            name: "admin_session",
            value: nuevoToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 8 * 60 * 60,
            path: "/",
        });

        return respuesta;
    } catch (error) {
        console.error(
            "Error cambiando contraseña:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "No fue posible cambiar la contraseña.",
            },
            { status: 500 }
        );
    }
}