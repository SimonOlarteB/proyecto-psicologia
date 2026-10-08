import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader } from "mysql2";
import pool from "../../lib/db";
import { verificarSesion } from "../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

// ======================================================
// OBTENER PUBLICACIONES
// ======================================================
// PÚBLICO:
//   GET /api/publicaciones
//   → Solo publicaciones PUBLICADAS
//
// ADMIN:
//   GET /api/publicaciones?admin=true
//   → Todas las publicaciones
// ======================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const esAdmin = searchParams.get("admin") === "true";

    if (esAdmin) {
      const sesion = await obtenerSesionAdmin();

      if (!sesion) {
        return NextResponse.json(
          { error: "No autorizado." },
          { status: 401 }
        );
      }

      const [filas] = await pool.query(`
        SELECT
          id,
          titulo,
          resumen,
          contenido,
          imagen_url,
          estado,
          fecha_publicacion,
          creado_en,
          actualizado_en
        FROM publicaciones
        ORDER BY
          COALESCE(fecha_publicacion, creado_en) DESC,
          id DESC
      `);

      return NextResponse.json(filas);
    }

    const [filas] = await pool.query(`
      SELECT
        id,
        titulo,
        resumen,
        contenido,
        imagen_url,
        estado,
        fecha_publicacion,
        creado_en,
        actualizado_en
      FROM publicaciones
      WHERE estado = 'PUBLICADO'
      ORDER BY fecha_publicacion DESC, id DESC
    `);

    return NextResponse.json(filas);
  } catch (error) {
    console.error("Error obteniendo publicaciones:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener las publicaciones.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// CREAR PUBLICACIÓN
// ======================================================
// SOLO ADMINISTRADOR
// ======================================================

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const datos = await request.json();

    const {
      titulo,
      resumen,
      contenido,
      imagen_url,
      estado,
      fecha_publicacion,
    } = datos;

    if (!titulo || !contenido) {
      return NextResponse.json(
        {
          error: "El título y el contenido son obligatorios.",
        },
        { status: 400 }
      );
    }

    const estadoFinal =
      estado === "PUBLICADO" ? "PUBLICADO" : "BORRADOR";

    let fechaFinal = null;

    if (estadoFinal === "PUBLICADO") {
      fechaFinal = fecha_publicacion || new Date();
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO publicaciones (
        titulo,
        resumen,
        contenido,
        imagen_url,
        estado,
        fecha_publicacion
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        titulo.trim(),
        resumen?.trim() || null,
        contenido.trim(),
        imagen_url?.trim() || null,
        estadoFinal,
        fechaFinal,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Publicación creada correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando publicación:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear la publicación.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// ACTUALIZAR PUBLICACIÓN
// ======================================================
// SOLO ADMINISTRADOR
// ======================================================

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

    const {
      id,
      titulo,
      resumen,
      contenido,
      imagen_url,
      estado,
      fecha_publicacion,
    } = datos;

    if (!id || !titulo || !contenido) {
      return NextResponse.json(
        {
          error: "El ID, título y contenido son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (!["BORRADOR", "PUBLICADO"].includes(estado)) {
      return NextResponse.json(
        {
          error: "El estado de la publicación no es válido.",
        },
        { status: 400 }
      );
    }

    let fechaFinal = fecha_publicacion || null;

    // Si se publica y no existe fecha,
    // se establece la fecha actual.
    if (estado === "PUBLICADO" && !fechaFinal) {
      fechaFinal = new Date();
    }

    // Si vuelve a borrador, quitamos la fecha de publicación.
    if (estado === "BORRADOR") {
      fechaFinal = null;
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      UPDATE publicaciones
      SET
        titulo = ?,
        resumen = ?,
        contenido = ?,
        imagen_url = ?,
        estado = ?,
        fecha_publicacion = ?
      WHERE id = ?
      `,
      [
        titulo.trim(),
        resumen?.trim() || null,
        contenido.trim(),
        imagen_url?.trim() || null,
        estado,
        fechaFinal,
        id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          error: "La publicación no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Publicación actualizada correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando publicación:", error);

    return NextResponse.json(
      {
        error: "No se pudo actualizar la publicación.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// ELIMINAR PUBLICACIÓN
// ======================================================
// SOLO ADMINISTRADOR
// ======================================================

export async function DELETE(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const datos = await request.json();
    const { id } = datos;

    if (!id) {
      return NextResponse.json(
        {
          error: "El ID de la publicación es obligatorio.",
        },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      DELETE FROM publicaciones
      WHERE id = ?
      `,
      [id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          error: "La publicación no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Publicación eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando publicación:", error);

    return NextResponse.json(
      {
        error: "No se pudo eliminar la publicación.",
      },
      { status: 500 }
    );
  }
}