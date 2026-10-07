import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "../../lib/db";
import { verificarSesion } from "../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

// =====================================================
// OBTENER TESTIMONIOS PUBLICADOS
// PÚBLICO
// =====================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const esAdmin = searchParams.get("admin") === "true";

    // =====================================================
    // PANEL ADMINISTRATIVO
    // =====================================================

    if (esAdmin) {
      const sesion = await obtenerSesionAdmin();

      if (!sesion) {
        return NextResponse.json(
          {
            error: "No autorizado.",
          },
          { status: 401 }
        );
      }

      const [filas] = await pool.query(`
        SELECT
          id,
          nombre,
          comentario,
          publicado,
          creado_en,
          actualizado_en
        FROM testimonios
        ORDER BY id DESC
      `);

      return NextResponse.json(filas);
    }

    // =====================================================
    // PÁGINA PÚBLICA
    // =====================================================

    const [filas] = await pool.query(`
      SELECT
        id,
        nombre,
        comentario,
        publicado,
        creado_en,
        actualizado_en
      FROM testimonios
      WHERE publicado = 1
      ORDER BY id DESC
    `);

    return NextResponse.json(filas);
  } catch (error) {
    console.error("Error obteniendo testimonios:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener los testimonios.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// CREAR TESTIMONIO
// SOLO ADMINISTRADOR
// =====================================================

export async function POST(request: Request) {
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
      nombre,
      comentario,
      publicado,
    } = datos;

    if (!nombre || !comentario) {
      return NextResponse.json(
        {
          error:
            "El nombre y el comentario son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (nombre.trim().length < 2) {
      return NextResponse.json(
        {
          error:
            "El nombre debe tener al menos 2 caracteres.",
        },
        { status: 400 }
      );
    }

    if (comentario.trim().length < 5) {
      return NextResponse.json(
        {
          error:
            "El comentario debe tener al menos 5 caracteres.",
        },
        { status: 400 }
      );
    }

    const [resultado]: any = await pool.query(
      `
      INSERT INTO testimonios (
        nombre,
        comentario,
        publicado
      )
      VALUES (?, ?, ?)
      `,
      [
        nombre.trim(),
        comentario.trim(),
        publicado === undefined ? 0 : publicado ? 1 : 0,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Testimonio creado correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando testimonio:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el testimonio.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// MODIFICAR TESTIMONIO
// SOLO ADMINISTRADOR
// =====================================================

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
      id,
      nombre,
      comentario,
      publicado,
    } = datos;

    if (!id || !nombre || !comentario) {
      return NextResponse.json(
        {
          error:
            "El ID, nombre y comentario son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (nombre.trim().length < 2) {
      return NextResponse.json(
        {
          error:
            "El nombre debe tener al menos 2 caracteres.",
        },
        { status: 400 }
      );
    }

    if (comentario.trim().length < 5) {
      return NextResponse.json(
        {
          error:
            "El comentario debe tener al menos 5 caracteres.",
        },
        { status: 400 }
      );
    }

    const [resultado]: any = await pool.query(
      `
      UPDATE testimonios
      SET
        nombre = ?,
        comentario = ?,
        publicado = ?
      WHERE id = ?
      `,
      [
        nombre.trim(),
        comentario.trim(),
        publicado ? 1 : 0,
        id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          error: "El testimonio no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Testimonio actualizado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error actualizando testimonio:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo actualizar el testimonio.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DESPUBLICAR TESTIMONIO
// SOLO ADMINISTRADOR
// =====================================================

export async function DELETE(request: Request) {
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

    const { id, accion } = datos;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "El ID del testimonio es obligatorio.",
        },
        { status: 400 }
      );
    }

    // Borrado permanente: elimina la fila de la base de datos.
    // Se pide explícitamente con accion: "borrar"; si no se envía,
    // se mantiene el comportamiento de siempre (solo lo retira).
    if (accion === "borrar") {
      const [resultadoBorrado]: any = await pool.query(
        `
        DELETE FROM testimonios
        WHERE id = ?
        `,
        [id]
      );

      if (resultadoBorrado.affectedRows === 0) {
        return NextResponse.json(
          {
            error: "El testimonio no existe.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        mensaje:
          "Testimonio eliminado permanentemente.",
      });
    }

    const [resultado]: any = await pool.query(
      `
      UPDATE testimonios
      SET publicado = 0
      WHERE id = ?
      `,
      [id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          error: "El testimonio no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje:
        "Testimonio retirado del sitio correctamente.",
    });
  } catch (error) {
    console.error(
      "Error despublicando testimonio:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo retirar el testimonio.",
      },
      { status: 500 }
    );
  }
}