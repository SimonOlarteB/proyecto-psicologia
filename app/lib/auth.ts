import crypto from "crypto";

export type SesionAdmin = {
    id: number;
    debeCambiarPassword: boolean;
    exp: number;
};

export function verificarSesion(token: string | undefined): SesionAdmin | null {
    if (!token) return null;

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        console.error("AUTH_SECRET no está configurado.");
        return null;
    }

    try {
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
        const firmaEsperadaBuffer = Buffer.from(firmaEsperada, "utf8");

        if (firmaBuffer.length !== firmaEsperadaBuffer.length) {
            return null;
        }

        if (!crypto.timingSafeEqual(firmaBuffer, firmaEsperadaBuffer)) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(contenido, "base64url").toString("utf8")
        );

        if (
            !payload ||
            !payload.id ||
            !payload.exp ||
            typeof payload.id !== "number" ||
            typeof payload.exp !== "number"
        ) {
            return null;
        }

        if (Date.now() >= payload.exp) {
            return null;
        }

        return {
            id: payload.id,
            debeCambiarPassword: Boolean(payload.debeCambiarPassword),
            exp: payload.exp,
        };
    } catch (error) {
        console.error("Error verificando sesión:", error);
        return null;
    }
}