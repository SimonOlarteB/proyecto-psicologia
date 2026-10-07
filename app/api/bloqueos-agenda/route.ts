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

function esFechaHoraLocal(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) &&
    !Number.isNaN(new Date(`${valor}:00Z`).getTime())
  );
}

export async function GET(request: Request) {
  try {
    const fecha = new URL(request.url).searchParams.get("fecha");

    let consulta = `
      SELECT
        id,
        DATE_FORMAT(inicio, '%Y-%m-%dT%H:%i') AS inicio,
        DATE_FORMAT(fin, '%Y-%m-%dT%H:%i') AS fin
      FROM bloqueos_agenda
      WHERE activo = 1
    `;
    const parametros: string[] = [];

    if (fecha) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return NextResponse.json({ error: "La fecha no es válida." }, { status: 400 });
      }

      consulta += `
        AND inicio < DATE_ADD(?, INTERVAL 1 DAY)
        AND fin > ?
      `;
      parametros.push(fecha, fecha);
    }

    consulta += " ORDER BY inicio";

    const [bloqueos] = await pool.query(consulta, parametros);
    return NextResponse.json(bloqueos);
  } catch (error) {
    console.error("Error consultando bloqueos de agenda:", error);
    return NextResponse.json(
      { error: "No se pudieron consultar los bloqueos de agenda." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const datos = await request.json();
    const { inicio, fin } = datos;

    if (!esFechaHoraLocal(inicio) || !esFechaHoraLocal(fin) || inicio >= fin) {
      return NextResponse.json(
        { error: "Selecciona una fecha y hora final posteriores al inicio." },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO bloqueos_agenda (inicio, fin, activo)
      VALUES (STR_TO_DATE(?, '%Y-%m-%dT%H:%i'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i'), 1)
      `,
      [inicio, fin]
    );

    return NextResponse.json(
      { id: resultado.insertId, mensaje: "Bloqueo de agenda creado." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando bloqueo de agenda:", error);
    return NextResponse.json(
      { error: "No se pudo crear el bloqueo de agenda." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await request.json();

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return NextResponse.json({ error: "El bloqueo no es válido." }, { status: 400 });
    }

    await pool.query("UPDATE bloqueos_agenda SET activo = 0 WHERE id = ?", [id]);

    return NextResponse.json({ mensaje: "Bloqueo de agenda desactivado." });
  } catch (error) {
    console.error("Error desactivando bloqueo de agenda:", error);
    return NextResponse.json(
      { error: "No se pudo desactivar el bloqueo de agenda." },
      { status: 500 }
    );
  }
}