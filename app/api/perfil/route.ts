import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../../lib/db";
import { verificarSesion } from "../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

// Obtener información del perfil
// PÚBLICO
export async function GET() {
  try {
    const [filas] = await pool.query<RowDataPacket[]>(`
      SELECT
        id,
        nombre_profesional,
        profesion,
        descripcion,
        foto_url,
        logo_url,
        whatsapp,
        correo,
        direccion,
        actualizado_en
      FROM configuracion_general
      ORDER BY id ASC
      LIMIT 1
    `);

    if (filas.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(filas[0]);
  } catch (error) {
    console.error("Error obteniendo perfil:", error);

    return NextResponse.json(
      {
        error: "No se pudo obtener la información del perfil.",
      },
      { status: 500 }
    );
  }
}

// Actualizar información del perfil
// SOLO ADMINISTRADOR
export async function PUT(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const datos = await request.json();

    const {
      nombre_profesional,
      profesion,
      descripcion,
      foto_url,
      logo_url,
      whatsapp,
      correo,
      direccion,
    } = datos;

    if (!nombre_profesional || !profesion) {
      return NextResponse.json(
        {
          error:
            "El nombre profesional y la profesión son obligatorios.",
        },
        { status: 400 }
      );
    }

    const [filas] = await pool.query<RowDataPacket[]>(`
      SELECT id
      FROM configuracion_general
      ORDER BY id ASC
      LIMIT 1
    `);

    // Convertimos cadenas vacías en NULL.
    // Esto permite quitar completamente la foto o el logo.
    const fotoUrlFinal =
      typeof foto_url === "string" && foto_url.trim()
        ? foto_url.trim()
        : null;

    const logoUrlFinal =
      typeof logo_url === "string" && logo_url.trim()
        ? logo_url.trim()
        : null;

    const descripcionFinal =
      typeof descripcion === "string" && descripcion.trim()
        ? descripcion.trim()
        : null;

    const whatsappFinal =
      typeof whatsapp === "string" && whatsapp.trim()
        ? whatsapp.trim()
        : null;

    const correoFinal =
      typeof correo === "string" && correo.trim()
        ? correo.trim()
        : null;

    const direccionFinal =
      typeof direccion === "string" && direccion.trim()
        ? direccion.trim()
        : null;

    if (filas.length === 0) {
      const [resultado] = await pool.query<ResultSetHeader>(
        `
        INSERT INTO configuracion_general (
          nombre_profesional,
          profesion,
          descripcion,
          foto_url,
          logo_url,
          whatsapp,
          correo,
          direccion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          nombre_profesional.trim(),
          profesion.trim(),
          descripcionFinal,
          fotoUrlFinal,
          logoUrlFinal,
          whatsappFinal,
          correoFinal,
          direccionFinal,
        ]
      );

      return NextResponse.json(
        {
          mensaje: "Perfil creado correctamente.",
          id: resultado.insertId,
        },
        { status: 201 }
      );
    }

    const id = filas[0].id;

    await pool.query(
      `
      UPDATE configuracion_general
      SET
        nombre_profesional = ?,
        profesion = ?,
        descripcion = ?,
        foto_url = ?,
        logo_url = ?,
        whatsapp = ?,
        correo = ?,
        direccion = ?
      WHERE id = ?
      `,
      [
        nombre_profesional.trim(),
        profesion.trim(),
        descripcionFinal,
        fotoUrlFinal,
        logoUrlFinal,
        whatsappFinal,
        correoFinal,
        direccionFinal,
        id,
      ]
    );

    return NextResponse.json({
      mensaje: "Perfil actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando perfil:", error);

    return NextResponse.json(
      {
        error: "No se pudo actualizar el perfil.",
      },
      { status: 500 }
    );
  }
}