import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { google } from "googleapis";
import { verificarSesion } from "../../../lib/auth";
export async function GET() {
  try {
    // =====================================================
    // VERIFICAR SESIÓN DEL ADMINISTRADOR
    // =====================================================

    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    const sesion = verificarSesion(token);

    if (!sesion) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // VARIABLES DE ENTORNO
    // =====================================================

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error(
        "Faltan variables de entorno de Google OAuth."
      );

      return NextResponse.json(
        {
          error:
            "La configuración de Google Calendar está incompleta.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // CREAR CLIENTE OAUTH
    // =====================================================

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // =====================================================
    // ESTADO ANTI-CSRF
    // =====================================================

    const state = crypto.randomBytes(32).toString("hex");

    // =====================================================
    // URL DE AUTORIZACIÓN
    // =====================================================

    const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent select_account",
  scope: [
    "https://www.googleapis.com/auth/calendar.events",
  ],
  state,
});
    // =====================================================
    // GUARDAR STATE EN COOKIE
    // =====================================================

    const respuesta = NextResponse.redirect(
      authorizationUrl
    );

    respuesta.cookies.set(
      "google_oauth_state",
      state,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      }
    );

    return respuesta;
  } catch (error) {
    console.error(
      "Error iniciando conexión con Google Calendar:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible iniciar la conexión con Google Calendar.",
      },
      {
        status: 500,
      }
    );
  }
}