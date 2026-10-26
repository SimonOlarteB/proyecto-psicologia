import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../../../lib/db";
import { verificarSesion } from "../../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

// Detecta cuando falta la columna en la base de datos (SQL 004 sin ejecutar)
function esColumnaFaltante(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "ER_BAD_FIELD_ERROR"
  );
}

const MENSAJE_COLUMNA_FALTANTE =
  "Falta crear la columna foto_sobre_mi_url en la base de datos. Ejecuta el SQL 004_foto_sobre_mi.sql y vuelve a intentarlo.";

// Obtener la foto actual de "Sobre mí"
// SOLO ADMINISTRADOR (la página pública la lee directo de la base de datos)
export async function GET() {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const [filas] = await pool.query<RowDataPacket[]>(`
      SELECT id, foto_sobre_mi_url
      FROM configuracion_general
      ORDER BY id ASC
      LIMIT 1
    `);

    return NextResponse.json({
      foto_sobre_mi_url: filas[0]?.foto_sobre_mi_url ?? "",
    });
  } catch (error) {
    console.error("Error obteniendo la foto de Sobre mí:", error);

    if (esColumnaFaltante(error)) {
      return NextResponse.json(
        { error: MENSAJE_COLUMNA_FALTANTE },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo obtener la fotografía." },
      { status: 500 }
    );
  }
}

// Guardar (o quitar) la foto de "Sobre mí"
// SOLO ADMINISTRADOR
export async function PUT(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const datos = await request.json();

    const url =
      typeof datos.foto_sobre_mi_url === "string"
        ? datos.foto_sobre_mi_url.trim()
        : "";

    if (url) {
      if (url.length > 500) {
        return NextResponse.json(
          { error: "La dirección de la imagen es demasiado larga." },
          { status: 400 }
        );
      }

      if (!/^(https?:\/\/|\/)/.test(url)) {
        return NextResponse.json(
          { error: "La dirección de la imagen no es válida." },
          { status: 400 }
        );
      }
    }

    const [filas] = await pool.query<RowDataPacket[]>(`
      SELECT id
      FROM configuracion_general
      ORDER BY id ASC
      LIMIT 1
    `);

    if (filas.length === 0) {
      return NextResponse.json(
        {
          error:
            "Primero guarda el perfil profesional en la sección Perfil.",
        },
        { status: 404 }
      );
    }

    await pool.query<ResultSetHeader>(
      `
      UPDATE configuracion_general
      SET foto_sobre_mi_url = ?
      WHERE id = ?
      `,
      [url || null, filas[0].id]
    );

    return NextResponse.json({
      mensaje: "Fotografía actualizada correctamente.",
      foto_sobre_mi_url: url,
    });
  } catch (error) {
    console.error("Error guardando la foto de Sobre mí:", error);

    if (esColumnaFaltante(error)) {
      return NextResponse.json(
        { error: MENSAJE_COLUMNA_FALTANTE },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo guardar la fotografía." },
      { status: 500 }
    );
  }
}