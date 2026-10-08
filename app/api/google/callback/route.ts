import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import type { RowDataPacket } from "mysql2";
import pool from "./../../../lib/db";
import { cifrarToken } from "./../../../lib/seguridad-tokens";

export async function GET(request: Request) {
  try {
    // =====================================================
    // OBTENER PARÁMETROS DE GOOGLE
    // =====================================================

    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // =====================================================
    // SI GOOGLE DEVUELVE UN ERROR
    // =====================================================

    if (error) {
      console.error("Google OAuth devolvió un error:", error);

      return NextResponse.json(
        {
          error: "La autorización de Google fue cancelada o rechazada.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // VALIDAR PARÁMETROS
    // =====================================================

    if (!code || !state) {
      return NextResponse.json(
        {
          error: "Respuesta OAuth inválida.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // VALIDAR STATE
    // =====================================================

    const cookieStore = await cookies();

    const stateGuardado =
      cookieStore.get("google_oauth_state")?.value;

    if (!stateGuardado || stateGuardado !== state) {
      return NextResponse.json(
        {
          error: "La validación de seguridad de Google falló.",
        },
        { status: 403 }
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
        { status: 500 }
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
    // INTERCAMBIAR CODE POR TOKENS
    // =====================================================

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error(
        "Google no devolvió refresh_token."
      );

      return NextResponse.json(
        {
          error:
            "Google no devolvió el permiso de acceso permanente. Intenta conectar nuevamente.",
        },
        { status: 400 }
      );
    }

    oauth2Client.setCredentials(tokens);

    // =====================================================
    // OBTENER CALENDARIO PRINCIPAL
    // =====================================================

  const calendarId = "primary";
const emailGoogle = "Cuenta Google";

    // =====================================================
    // GUARDAR CONEXIÓN EN MYSQL
    // =====================================================

    const [configuracionExistente] =
      await pool.query<RowDataPacket[]>(
        `
        SELECT id
        FROM google_calendar_config
        LIMIT 1
        `
      );

    if (configuracionExistente.length > 0) {
      await pool.query(
        `
        UPDATE google_calendar_config
        SET
          email_google = ?,
          refresh_token = ?,
          calendar_id = ?,
          activo = 1
        WHERE id = ?
        `,
        [
          emailGoogle,
          // Se guarda cifrado en reposo (AES-256-GCM).
          cifrarToken(tokens.refresh_token),
          calendarId,
          configuracionExistente[0].id,
        ]
      );
    } else {
      await pool.query(
        `
        INSERT INTO google_calendar_config (
          email_google,
          refresh_token,
          calendar_id,
          activo
        )
        VALUES (?, ?, ?, 1)
        `,
        [
          emailGoogle,
          cifrarToken(tokens.refresh_token),
          calendarId,
        ]
      );
    }

    // =====================================================
    // ELIMINAR COOKIE DE STATE
    // =====================================================

    const respuesta = NextResponse.redirect(
      new URL("/admin", request.url)
    );

    respuesta.cookies.delete("google_oauth_state");

    return respuesta;
  } catch (error) {
    console.error(
      "Error procesando callback de Google Calendar:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible completar la conexión con Google Calendar.",
      },
      {
        status: 500,
      }
    );
  }
}