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

// Obtener fechas especiales activas
// Esta consulta es pública porque la utiliza /agendar
export async function GET() {
  try {
    const [filas] = await pool.query(`
      SELECT
        id,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
        TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin,
        activo
      FROM disponibilidad_especial
      WHERE activo = 1
      ORDER BY fecha, hora_inicio
    `);

    return NextResponse.json(filas);
  } catch (error) {
    console.error("Error obteniendo fechas especiales:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las fechas especiales." },
      { status: 500 }
    );
  }
}

// Crear una fecha especial
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

    const { fecha, hora_inicio, hora_fin, activo } = datos;

    if (!fecha) {
      return NextResponse.json(
        { error: "La fecha es obligatoria." },
        { status: 400 }
      );
    }

    // Si se proporcionan horarios, ambos son obligatorios
    if (
      (hora_inicio && !hora_fin) ||
      (!hora_inicio && hora_fin)
    ) {
      return NextResponse.json(
        {
          error:
            "Debes proporcionar tanto la hora de inicio como la hora de fin.",
        },
        { status: 400 }
      );
    }

    // Si hay horario, validar que inicio sea menor que fin
    if (hora_inicio && hora_fin && hora_inicio >= hora_fin) {
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
      INSERT INTO disponibilidad_especial
        (fecha, hora_inicio, hora_fin, activo)
      VALUES (?, ?, ?, ?)
      `,
      [
        fecha,
        hora_inicio || null,
        hora_fin || null,
        activo === undefined ? 1 : activo ? 1 : 0,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Fecha especial creada correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando fecha especial:", error);

    return NextResponse.json(
      { error: "No se pudo crear la fecha especial." },
      { status: 500 }
    );
  }
}

// Modificar una fecha especial
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
      fecha,
      hora_inicio,
      hora_fin,
      activo,
    } = datos;

    if (!id || !fecha) {
      return NextResponse.json(
        { error: "El id y la fecha son obligatorios." },
        { status: 400 }
      );
    }

    if (
      (hora_inicio && !hora_fin) ||
      (!hora_inicio && hora_fin)
    ) {
      return NextResponse.json(
        {
          error:
            "Debes proporcionar tanto la hora de inicio como la hora de fin.",
        },
        { status: 400 }
      );
    }

    if (hora_inicio && hora_fin && hora_inicio >= hora_fin) {
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
      UPDATE disponibilidad_especial
      SET
        fecha = ?,
        hora_inicio = ?,
        hora_fin = ?,
        activo = ?
      WHERE id = ?
      `,
      [
        fecha,
        hora_inicio || null,
        hora_fin || null,
        activo === undefined ? 1 : activo ? 1 : 0,
        id,
      ]
    );

    return NextResponse.json({
      mensaje: "Fecha especial actualizada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error actualizando fecha especial:",
      error
    );

    return NextResponse.json(
      { error: "No se pudo actualizar la fecha especial." },
      { status: 500 }
    );
  }
}

// Desactivar una fecha especial
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
            "El id de la fecha especial es obligatorio.",
        },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE disponibilidad_especial
      SET activo = 0
      WHERE id = ?
      `,
      [id]
    );

    return NextResponse.json({
      mensaje: "Fecha especial desactivada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error desactivando fecha especial:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo desactivar la fecha especial.",
      },
      { status: 500 }
    );
  }
}