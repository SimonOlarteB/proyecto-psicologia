import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../../lib/db";
import { verificarSesion } from "../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

type PromocionValidada = {
  titulo: string;
  descripcion: string;
  porcentaje_descuento: number;
  accion: "COTIZAR" | "AGENDAR";
  servicio_id: number | null;
  enlace: string | null;
  activo: number;
  orden: number;
};

// Valida y normaliza los datos recibidos del formulario.
function validarPromocion(
  datos: Record<string, unknown>
): { error: string } | { valores: PromocionValidada } {
  const titulo =
    typeof datos.titulo === "string" ? datos.titulo.trim() : "";
  const descripcion =
    typeof datos.descripcion === "string" ? datos.descripcion.trim() : "";
  const enlace =
    typeof datos.enlace === "string" ? datos.enlace.trim() : "";
  const porcentaje = Number(datos.porcentaje_descuento ?? 0);
  const orden = Number(datos.orden ?? 0);
  const accion = datos.accion;

  if (!titulo || !descripcion) {
    return { error: "El título y la descripción son obligatorios." };
  }

  if (titulo.length > 200) {
    return { error: "El título no puede superar los 200 caracteres." };
  }

  if (accion !== "COTIZAR" && accion !== "AGENDAR") {
    return { error: "La acción debe ser Cotizar o Agendar." };
  }

  if (!Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    return {
      error: "El porcentaje de descuento debe ser un número entero entre 0 y 100.",
    };
  }

  if (!Number.isInteger(orden)) {
    return { error: "El orden debe ser un número entero." };
  }

  if (enlace) {
    if (enlace.length > 500) {
      return { error: "El enlace no puede superar los 500 caracteres." };
    }

    if (!/^(https?:\/\/|\/|#)/.test(enlace)) {
      return {
        error: "El enlace debe empezar por http://, https://, / o #.",
      };
    }
  }

  let servicioId: number | null = null;

  if (accion === "AGENDAR") {
    const crudo = datos.servicio_id;

    if (crudo !== undefined && crudo !== null && crudo !== "") {
      servicioId = Number(crudo);

      if (!Number.isInteger(servicioId) || servicioId <= 0) {
        return { error: "El servicio seleccionado no es válido." };
      }
    }
  }

  if (accion === "AGENDAR" && porcentaje > 0 && servicioId === null && !enlace) {
    return {
      error:
        "Para aplicar el descuento en el pago, selecciona el servicio a agendar.",
    };
  }

  return {
    valores: {
      titulo,
      descripcion,
      porcentaje_descuento: porcentaje,
      accion,
      servicio_id: servicioId,
      enlace: enlace || null,
      activo: datos.activo === undefined ? 1 : datos.activo ? 1 : 0,
      orden,
    },
  };
}

async function servicioExiste(id: number) {
  const [filas] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM servicios WHERE id = ? LIMIT 1",
    [id]
  );

  return filas.length > 0;
}

// GET /api/promociones?id=X  -> PÚBLICO: datos mínimos de una promoción
//                               activa de tipo AGENDAR (lo usa /agendar)
// GET /api/promociones       -> SOLO ADMINISTRADOR: lista completa
export async function GET(request: Request) {
  try {
    const idSolicitado = new URL(request.url).searchParams.get("id");

    if (idSolicitado) {
      const idPromocion = Number(idSolicitado);

      if (!Number.isInteger(idPromocion) || idPromocion <= 0) {
        return NextResponse.json(
          { error: "La promoción no es válida." },
          { status: 400 }
        );
      }

      const [filas] = await pool.query<RowDataPacket[]>(
        `
        SELECT
          id,
          titulo,
          porcentaje_descuento,
          servicio_id
        FROM promociones
        WHERE id = ?
          AND activo = 1
          AND accion = 'AGENDAR'
        LIMIT 1
        `,
        [idPromocion]
      );

      if (filas.length === 0) {
        return NextResponse.json(
          { error: "La promoción no está disponible." },
          { status: 404 }
        );
      }

      return NextResponse.json(filas[0]);
    }

    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const [rows] = await pool.query(`
      SELECT
        id,
        titulo,
        descripcion,
        porcentaje_descuento,
        accion,
        servicio_id,
        enlace,
        activo,
        orden,
        creado_en,
        actualizado_en
      FROM promociones
      ORDER BY orden ASC, id DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener promociones:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las promociones." },
      { status: 500 }
    );
  }
}

// Crear promoción
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
    const validacion = validarPromocion(datos);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const v = validacion.valores;

    if (v.servicio_id !== null && !(await servicioExiste(v.servicio_id))) {
      return NextResponse.json(
        { error: "El servicio seleccionado no existe." },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO promociones (
        titulo,
        descripcion,
        porcentaje_descuento,
        accion,
        servicio_id,
        enlace,
        activo,
        orden
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        v.titulo,
        v.descripcion,
        v.porcentaje_descuento,
        v.accion,
        v.servicio_id,
        v.enlace,
        v.activo,
        v.orden,
      ]
    );

    return NextResponse.json(
      {
        mensaje: "Promoción creada correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando promoción:", error);

    return NextResponse.json(
      { error: "No se pudo crear la promoción." },
      { status: 500 }
    );
  }
}

// Modificar promoción
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

    if (!datos.id) {
      return NextResponse.json(
        { error: "El ID de la promoción es obligatorio." },
        { status: 400 }
      );
    }

    const validacion = validarPromocion(datos);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const v = validacion.valores;

    if (v.servicio_id !== null && !(await servicioExiste(v.servicio_id))) {
      return NextResponse.json(
        { error: "El servicio seleccionado no existe." },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      `
      UPDATE promociones
      SET
        titulo = ?,
        descripcion = ?,
        porcentaje_descuento = ?,
        accion = ?,
        servicio_id = ?,
        enlace = ?,
        activo = ?,
        orden = ?
      WHERE id = ?
      `,
      [
        v.titulo,
        v.descripcion,
        v.porcentaje_descuento,
        v.accion,
        v.servicio_id,
        v.enlace,
        v.activo,
        v.orden,
        datos.id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        { error: "La promoción no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Promoción actualizada correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando promoción:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la promoción." },
      { status: 500 }
    );
  }
}

// Eliminar promoción
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

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "El ID de la promoción es obligatorio." },
        { status: 400 }
      );
    }

    const [resultado] = await pool.query<ResultSetHeader>(
      "DELETE FROM promociones WHERE id = ?",
      [id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json(
        { error: "La promoción no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mensaje: "Promoción eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando promoción:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la promoción." },
      { status: 500 }
    );
  }
}