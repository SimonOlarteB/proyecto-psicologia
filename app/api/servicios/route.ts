import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "../../lib/db";
import { verificarSesion } from "../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

// Obtener servicios activos
// PÚBLICO: lo utiliza la página y /agendar
export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        nombre,
        descripcion,
        tipo_servicio,
        precio,
        duracion_minutos,
        modalidad,
        activo,
        creado_en,
        actualizado_en
      FROM servicios
      WHERE activo = 1
      ORDER BY id DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener servicios:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los servicios." },
      { status: 500 }
    );
  }
}

// Crear servicio
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
      nombre,
      descripcion,
      tipo_servicio = "NORMAL",
      precio,
      duracion_minutos,
      modalidad,
      activo,
    } = datos;

    const esEspecial = tipo_servicio === "ESPECIAL";
    const precioFinal = esEspecial ? 0 : Number(precio);
    const duracionFinal = esEspecial
      ? 1
      : Number(duracion_minutos);
    const modalidadFinal = esEspecial
      ? "AMBAS"
      : modalidad;

    if (
      !nombre ||
      (esEspecial && !descripcion?.trim()) ||
      (!esEspecial &&
        (precio === undefined ||
          duracion_minutos === undefined ||
          !modalidad))
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    if (!["NORMAL", "ESPECIAL"].includes(tipo_servicio)) {
      return NextResponse.json(
        { error: "El tipo de servicio no es válido." },
        { status: 400 }
      );
    }

    if (!esEspecial && !["PRESENCIAL", "VIRTUAL", "AMBAS"].includes(modalidadFinal)) {
  return NextResponse.json(
    { error: "La modalidad no es válida." },
    { status: 400 }
  );
}

    if (precioFinal < 0) {
      return NextResponse.json(
        { error: "El precio no puede ser negativo." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(duracionFinal) ||
      duracionFinal <= 0
    ) {
      return NextResponse.json(
        { error: "La duración debe ser un número entero mayor que 0." },
        { status: 400 }
      );
    }

    const [resultado]: any = await pool.query(
      `
      INSERT INTO servicios (
        nombre,
        descripcion,
        tipo_servicio,
        precio,
        duracion_minutos,
        modalidad,
        activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nombre.trim(),
        descripcion?.trim() || "",
        tipo_servicio,
        precioFinal,
        duracionFinal,
        modalidadFinal,
        activo === undefined ? 1 : activo ? 1 : 0,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Servicio creado correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando servicio:", error);

    return NextResponse.json(
      { error: "No se pudo crear el servicio." },
      { status: 500 }
    );
  }
}

// Modificar servicio
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
      nombre,
      descripcion,
      tipo_servicio = "NORMAL",
      precio,
      duracion_minutos,
      modalidad,
      activo,
    } = datos;

    const esEspecial = tipo_servicio === "ESPECIAL";
    const precioFinal = esEspecial ? 0 : Number(precio);
    const duracionFinal = esEspecial
      ? 1
      : Number(duracion_minutos);
    const modalidadFinal = esEspecial
      ? "AMBAS"
      : modalidad;

    if (
      !id ||
      !nombre ||
      (esEspecial && !descripcion?.trim()) ||
      (!esEspecial &&
        (precio === undefined ||
          duracion_minutos === undefined ||
          !modalidad))
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    if (!["NORMAL", "ESPECIAL"].includes(tipo_servicio)) {
      return NextResponse.json(
        { error: "El tipo de servicio no es válido." },
        { status: 400 }
      );
    }

    if (!esEspecial && !["PRESENCIAL", "VIRTUAL", "AMBAS"].includes(modalidadFinal)) {
      return NextResponse.json(
        { error: "La modalidad no es válida." },
        { status: 400 }
      );
    }

    if (precioFinal < 0) {
      return NextResponse.json(
        { error: "El precio no puede ser negativo." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(duracionFinal) ||
      duracionFinal <= 0
    ) {
      return NextResponse.json(
        { error: "La duración debe ser un número entero mayor que 0." },
        { status: 400 }
      );
    }

    const [resultado]: any = await pool.query(
      `
      UPDATE servicios
      SET
        nombre = ?,
        descripcion = ?,
        tipo_servicio = ?,
        precio = ?,
        duracion_minutos = ?,
        modalidad = ?,
        activo = ?
      WHERE id = ?
      `,
      [
        nombre.trim(),
        descripcion?.trim() || "",
        tipo_servicio,
        precioFinal,
        duracionFinal,
        modalidadFinal,
        activo === undefined ? 1 : activo ? 1 : 0,
        id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        { error: "El servicio no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Servicio actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando servicio:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el servicio." },
      { status: 500 }
    );
  }
}

// Desactivar servicio
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
        { error: "El ID del servicio es obligatorio." },
        { status: 400 }
      );
    }

    const [resultado]: any = await pool.query(
      `
      UPDATE servicios
      SET activo = 0
      WHERE id = ?
      `,
      [id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        { error: "El servicio no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Servicio desactivado correctamente.",
    });
  } catch (error) {
    console.error("Error desactivando servicio:", error);

    return NextResponse.json(
      { error: "No se pudo desactivar el servicio." },
      { status: 500 }
    );
  }
}