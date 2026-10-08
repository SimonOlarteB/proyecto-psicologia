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

// Obtener trayectoria activa
// PÚBLICO
export async function GET() {
  try {
    const [filas] = await pool.query(`
      SELECT
        id,
        tipo,
        titulo,
        institucion,
        descripcion,
        fecha_inicio,
        fecha_fin,
        imagen_url,
        orden,
        activo,
        creado_en,
        actualizado_en
      FROM trayectoria
      WHERE activo = 1
      ORDER BY orden ASC, fecha_inicio DESC, id DESC
    `);

    return NextResponse.json(filas);
  } catch (error) {
    console.error("Error obteniendo trayectoria:", error);

    return NextResponse.json(
      { error: "No se pudo obtener la trayectoria." },
      { status: 500 }
    );
  }
}

// Crear elemento de trayectoria
// SOLO ADMINISTRADOR
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
      tipo,
      titulo,
      institucion,
      descripcion,
      fecha_inicio,
      fecha_fin,
      imagen_url,
      orden,
      activo,
    } = datos;

    if (!tipo || !titulo) {
      return NextResponse.json(
        {
          error: "El tipo y el título son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (
      ![
        "TITULO",
        "CURSO",
        "DIPLOMADO",
        "CERTIFICACION",
      ].includes(tipo)
    ) {
      return NextResponse.json(
        {
          error: "El tipo de trayectoria no es válido.",
        },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO trayectoria (
        tipo,
        titulo,
        institucion,
        descripcion,
        fecha_inicio,
        fecha_fin,
        imagen_url,
        orden,
        activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tipo,
        titulo.trim(),
        institucion?.trim() || null,
        descripcion?.trim() || null,
        fecha_inicio || null,
        fecha_fin || null,
        imagen_url?.trim() || null,
        orden === undefined ? 0 : Number(orden),
        activo === undefined ? 1 : activo ? 1 : 0,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Elemento agregado correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando trayectoria:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el elemento.",
      },
      { status: 500 }
    );
  }
}

// Modificar elemento de trayectoria
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

    const {
      id,
      tipo,
      titulo,
      institucion,
      descripcion,
      fecha_inicio,
      fecha_fin,
      imagen_url,
      orden,
      activo,
    } = datos;

    if (!id || !tipo || !titulo) {
      return NextResponse.json(
        {
          error: "El ID, tipo y título son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (
      ![
        "TITULO",
        "CURSO",
        "DIPLOMADO",
        "CERTIFICACION",
      ].includes(tipo)
    ) {
      return NextResponse.json(
        {
          error: "El tipo de trayectoria no es válido.",
        },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      UPDATE trayectoria
      SET
        tipo = ?,
        titulo = ?,
        institucion = ?,
        descripcion = ?,
        fecha_inicio = ?,
        fecha_fin = ?,
        imagen_url = ?,
        orden = ?,
        activo = ?
      WHERE id = ?
      `,
      [
        tipo,
        titulo.trim(),
        institucion?.trim() || null,
        descripcion?.trim() || null,
        fecha_inicio || null,
        fecha_fin || null,
        imagen_url?.trim() || null,
        orden === undefined ? 0 : Number(orden),
        activo === undefined ? 1 : activo ? 1 : 0,
        id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          error: "El elemento no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Elemento actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando trayectoria:", error);

    return NextResponse.json(
      {
        error: "No se pudo actualizar el elemento.",
      },
      { status: 500 }
    );
  }
}

// Desactivar elemento de trayectoria
// SOLO ADMINISTRADOR
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
          error: "El ID del elemento es obligatorio.",
        },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      UPDATE trayectoria
      SET activo = 0
      WHERE id = ?
      `,
      [id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        {
          error: "El elemento no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Elemento desactivado correctamente.",
    });
  } catch (error) {
    console.error("Error desactivando trayectoria:", error);

    return NextResponse.json(
      {
        error: "No se pudo desactivar el elemento.",
      },
      { status: 500 }
    );
  }
}