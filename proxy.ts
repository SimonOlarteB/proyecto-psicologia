import { NextRequest, NextResponse } from "next/server";
import { verificarSesion } from "./app/lib/auth";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get("admin_session")?.value;
    const sesion = verificarSesion(token);

    // Proteger todo /admin
    if (pathname.startsWith("/admin")) {
        // No hay sesión válida
        if (!sesion) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }

        // Tiene sesión, pero todavía debe cambiar la contraseña
        if (sesion.debeCambiarPassword) {
            const url = request.nextUrl.clone();
            url.pathname = "/cambiar-password";
            return NextResponse.redirect(url);
        }
    }

    // Si ya está autenticado y entra a /login,
    // lo enviamos al lugar correspondiente.
    if (pathname === "/login" && sesion) {
        const url = request.nextUrl.clone();

        if (sesion.debeCambiarPassword) {
            url.pathname = "/cambiar-password";
        } else {
            url.pathname = "/admin";
        }

        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/login",
    ],
};