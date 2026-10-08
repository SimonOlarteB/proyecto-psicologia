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

// Obtener disponibilidades activas
// Esta consulta es pública porque la utiliza /agendar
export async function GET() {
  try {
    const [filas] = await pool.query(`
      SELECT
        id,
        dia_semana,
        hora_inicio,
        hora_fin,
        activo
      FROM disponibilidad
      WHERE activo = 1
      ORDER BY dia_semana, hora_inicio
    `);

    return NextResponse.json(filas);
  } catch (error) {
    console.error("Error obteniendo disponibilidad:", error);

    return NextResponse.json(
      { error: "No se pudo obtener la disponibilidad." },
      { status: 500 }
    );
  }
}

// Crear una disponibilidad
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

    const { dia_semana, hora_inicio, hora_fin } = datos;

    if (
      dia_semana === undefined ||
      !hora_inicio ||
      !hora_fin
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    if (dia_semana < 0 || dia_semana > 6) {
      return NextResponse.json(
        { error: "El día de la semana no es válido." },
        { status: 400 }
      );
    }

    if (hora_inicio >= hora_fin) {
      return NextResponse.json(
        {
          error:
            "La hora de inicio debe ser menor que la hora de fin.",
        },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO disponibilidad
        (dia_semana, hora_inicio, hora_fin, activo)
      VALUES
        (?, ?, ?, 1)
      `,
      [dia_semana, hora_inicio, hora_fin]
    );

    return NextResponse.json(
      {
        mensaje: "Disponibilidad creada correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando disponibilidad:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la disponibilidad.",
      },
      { status: 500 }
    );
  }
}

// Modificar una disponibilidad
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
      dia_semana,
      hora_inicio,
      hora_fin,
      activo,
    } = datos;

    if (
      !id ||
      dia_semana === undefined ||
      !hora_inicio ||
      !hora_fin
    ) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }

    if (dia_semana < 0 || dia_semana > 6) {
      return NextResponse.json(
        { error: "El día de la semana no es válido." },
        { status: 400 }
      );
    }

    if (hora_inicio >= hora_fin) {
      return NextResponse.json(
        {
          error:
            "La hora de inicio debe ser menor que la hora de fin.",
        },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE disponibilidad
      SET
        dia_semana = ?,
        hora_inicio = ?,
        hora_fin = ?,
        activo = ?
      WHERE id = ?
      `,
      [
        dia_semana,
        hora_inicio,
        hora_fin,
        activo === undefined ? 1 : activo ? 1 : 0,
        id,
      ]
    );

    return NextResponse.json({
      mensaje: "Disponibilidad actualizada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error actualizando disponibilidad:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo actualizar la disponibilidad.",
      },
      { status: 500 }
    );
  }
}

// Desactivar una disponibilidad
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
          error:
            "El ID de la disponibilidad es obligatorio.",
        },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE disponibilidad
      SET activo = 0
      WHERE id = ?
      `,
      [id]
    );

    return NextResponse.json({
      mensaje:
        "Disponibilidad desactivada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error desactivando disponibilidad:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo desactivar la disponibilidad.",
      },
      { status: 500 }
    );
  }
}