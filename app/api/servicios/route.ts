import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import pool from "../../lib/db";
import { verificarSesion } from "../../lib/auth";

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

type TipoServicio = "NORMAL" | "ESPECIAL" | "PROMOCION";

type ValoresServicio = {
  nombre: string;
  descripcion: string;
  tipo_servicio: TipoServicio;
  categoria: "PERSONAS" | "EMPRESAS";
  precioBase: number; // precio ingresado (sin promoción)
  porcentaje: number; // solo promociones
  incluidos: number[]; // solo promociones
  duracion: number;
  modalidad: string;
  activo: number;
};

type PreciosServicio = {
  precio: number; // lo que se cobra
  precioOriginal: number | null; // solo promociones
  porcentaje: number | null; // solo promociones
};

function calcularPrecioConDescuento(precio: number, porcentaje: number) {
  return Math.round((precio * (100 - porcentaje)) / 100);
}

// Valida los datos recibidos del formulario de servicios.
function validarServicio(
  datos: Record<string, unknown>
): { error: string } | { valores: ValoresServicio } {
  const nombre =
    typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const descripcion =
    typeof datos.descripcion === "string" ? datos.descripcion.trim() : "";
  const tipo = datos.tipo_servicio ?? "NORMAL";

  if (tipo !== "NORMAL" && tipo !== "ESPECIAL" && tipo !== "PROMOCION") {
    return { error: "El tipo de servicio no es válido." };
  }

  const esEspecial = tipo === "ESPECIAL";
  const esPromocion = tipo === "PROMOCION";

  // Las promociones siempre se muestran en la sección de personas.
  const categoria = esPromocion ? "PERSONAS" : datos.categoria ?? "PERSONAS";

  if (categoria !== "PERSONAS" && categoria !== "EMPRESAS") {
    return { error: "La categoría debe ser Personas o Empresas." };
  }

  if (!nombre) {
    return { error: "Faltan campos obligatorios." };
  }

  if ((esEspecial || esPromocion) && !descripcion) {
    return { error: "La descripción del servicio es obligatoria." };
  }

  const modalidad = esEspecial ? "AMBAS" : datos.modalidad;

  if (
    !esEspecial &&
    modalidad !== "PRESENCIAL" &&
    modalidad !== "VIRTUAL" &&
    modalidad !== "AMBAS"
  ) {
    return { error: "La modalidad no es válida." };
  }

  const duracion = esEspecial ? 1 : Number(datos.duracion_minutos);

  if (!Number.isInteger(duracion) || duracion <= 0) {
    return {
      error: "La duración debe ser un número entero mayor que 0.",
    };
  }

  let incluidos: number[] = [];
  let porcentaje = 0;

  if (esPromocion) {
    porcentaje = Number(datos.porcentaje_descuento);

    if (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 99) {
      return {
        error:
          "El porcentaje de descuento debe ser un número entero entre 1 y 99.",
      };
    }

    if (datos.servicios_incluidos !== undefined) {
      if (!Array.isArray(datos.servicios_incluidos)) {
        return { error: "Los servicios incluidos no son válidos." };
      }

      incluidos = Array.from(
        new Set(datos.servicios_incluidos.map((id) => Number(id)))
      );

      if (incluidos.some((id) => !Number.isInteger(id) || id <= 0)) {
        return { error: "Los servicios incluidos no son válidos." };
      }
    }
  }

  // Precio ingresado: no se pide en servicios especiales ni en
  // promociones que ya incluyen servicios (se calcula con su suma).
  const precioBase = esEspecial ? 0 : Number(datos.precio ?? 0);
  const necesitaPrecio = !esEspecial && !(esPromocion && incluidos.length > 0);

  if (necesitaPrecio) {
    if (datos.precio === undefined || datos.precio === "") {
      return { error: "Faltan campos obligatorios." };
    }

    if (!Number.isFinite(precioBase) || precioBase < 0) {
      return { error: "El precio no puede ser negativo." };
    }

    if (esPromocion && precioBase <= 0) {
      return { error: "Ingresa el precio sin promoción." };
    }
  }

  return {
    valores: {
      nombre,
      descripcion,
      tipo_servicio: tipo,
      categoria,
      precioBase,
      porcentaje,
      incluidos,
      duracion,
      modalidad: String(modalidad),
      activo: datos.activo === undefined ? 1 : datos.activo ? 1 : 0,
    },
  };
}

// Calcula el precio que se cobra. En promociones, el servidor
// vuelve a calcularlo con los precios reales de la base de datos.
async function calcularPrecios(
  conexion: PoolConnection,
  valores: ValoresServicio,
  idPropio?: number
): Promise<{ error: string } | { precios: PreciosServicio }> {
  if (valores.tipo_servicio !== "PROMOCION") {
    return {
      precios: {
        precio: valores.tipo_servicio === "ESPECIAL" ? 0 : valores.precioBase,
        precioOriginal: null,
        porcentaje: null,
      },
    };
  }

  let precioOriginal = valores.precioBase;

  if (valores.incluidos.length > 0) {
    if (idPropio !== undefined && valores.incluidos.includes(idPropio)) {
      return { error: "Una promoción no puede incluirse a sí misma." };
    }

    const [filas] = await conexion.query<RowDataPacket[]>(
      `
      SELECT id, precio
      FROM servicios
      WHERE id IN (?)
        AND tipo_servicio = 'NORMAL'
      `,
      [valores.incluidos]
    );

    if (filas.length !== valores.incluidos.length) {
      return {
        error:
          "Alguno de los servicios seleccionados no existe o no es un servicio con agenda y pago.",
      };
    }

    precioOriginal = filas.reduce(
      (total, fila) => total + Number(fila.precio),
      0
    );
  }

  const precio = calcularPrecioConDescuento(precioOriginal, valores.porcentaje);

  if (!Number.isFinite(precioOriginal) || precioOriginal <= 0 || precio <= 0) {
    return { error: "El precio de la promoción no es válido." };
  }

  return {
    precios: {
      precio,
      precioOriginal,
      porcentaje: valores.porcentaje,
    },
  };
}

// Reemplaza los servicios incluidos de una promoción.
async function guardarServiciosIncluidos(
  conexion: PoolConnection,
  promocionId: number,
  incluidos: number[]
) {
  await conexion.query(
    "DELETE FROM servicio_promocion_items WHERE promocion_id = ?",
    [promocionId]
  );

  if (incluidos.length > 0) {
    await conexion.query(
      "INSERT INTO servicio_promocion_items (promocion_id, servicio_id) VALUES ?",
      [incluidos.map((servicioId) => [promocionId, servicioId])]
    );
  }
}

// Recalcula el precio de una promoción con los precios actuales
// de los servicios que incluye.
async function recalcularPromocion(
  conexion: PoolConnection,
  promocionId: number
) {
  const [promociones] = await conexion.query<RowDataPacket[]>(
    `
    SELECT porcentaje_descuento
    FROM servicios
    WHERE id = ?
      AND tipo_servicio = 'PROMOCION'
    LIMIT 1
    `,
    [promocionId]
  );

  if (promociones.length === 0) return;

  const [sumas] = await conexion.query<RowDataPacket[]>(
    `
    SELECT
      COUNT(*) AS cantidad,
      COALESCE(SUM(s.precio), 0) AS total
    FROM servicio_promocion_items i
    INNER JOIN servicios s ON s.id = i.servicio_id
    WHERE i.promocion_id = ?
    `,
    [promocionId]
  );

  if (Number(sumas[0].cantidad) === 0) return;

  const total = Number(sumas[0].total);
  const porcentaje = Number(promociones[0].porcentaje_descuento) || 0;
  const precioFinal = calcularPrecioConDescuento(total, porcentaje);

  if (total <= 0 || precioFinal <= 0) return;

  await conexion.query(
    "UPDATE servicios SET precio_original = ?, precio = ? WHERE id = ?",
    [total, precioFinal, promocionId]
  );
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
        categoria,
        precio,
        porcentaje_descuento,
        precio_original,
        duracion_minutos,
        modalidad,
        activo,
        creado_en,
        actualizado_en,
        (
          SELECT GROUP_CONCAT(i.servicio_id ORDER BY i.servicio_id)
          FROM servicio_promocion_items i
          WHERE i.promocion_id = servicios.id
        ) AS servicios_incluidos
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
  let conexion: PoolConnection | null = null;

  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const datos = await request.json();
    const validacion = validarServicio(datos);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const v = validacion.valores;

    conexion = await pool.getConnection();

    const calculo = await calcularPrecios(conexion, v);

    if ("error" in calculo) {
      return NextResponse.json(
        { error: calculo.error },
        { status: 400 }
      );
    }

    const { precio, precioOriginal, porcentaje } = calculo.precios;

    await conexion.beginTransaction();

    const [resultado] = await conexion.query<ResultSetHeader>(
      `
      INSERT INTO servicios (
        nombre,
        descripcion,
        tipo_servicio,
        categoria,
        precio,
        porcentaje_descuento,
        precio_original,
        duracion_minutos,
        modalidad,
        activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        v.nombre,
        v.descripcion,
        v.tipo_servicio,
        v.categoria,
        precio,
        porcentaje,
        precioOriginal,
        v.duracion,
        v.modalidad,
        v.activo,
      ]
    );

    if (v.tipo_servicio === "PROMOCION") {
      await guardarServiciosIncluidos(
        conexion,
        resultado.insertId,
        v.incluidos
      );
    }

    await conexion.commit();

    return NextResponse.json(
      {
        mensaje: "Servicio creado correctamente.",
        id: resultado.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error("Error haciendo rollback:", rollbackError);
      }
    }

    console.error("Error creando servicio:", error);

    return NextResponse.json(
      { error: "No se pudo crear el servicio." },
      { status: 500 }
    );
  } finally {
    conexion?.release();
  }
}

// Modificar servicio
// SOLO ADMINISTRADOR
export async function PUT(request: Request) {
  let conexion: PoolConnection | null = null;

  try {
    const sesion = await obtenerSesionAdmin();

    if (!sesion) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const datos = await request.json();
    const id = Number(datos.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    const validacion = validarServicio(datos);

    if ("error" in validacion) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const v = validacion.valores;

    conexion = await pool.getConnection();

    const calculo = await calcularPrecios(conexion, v, id);

    if ("error" in calculo) {
      return NextResponse.json(
        { error: calculo.error },
        { status: 400 }
      );
    }

    const { precio, precioOriginal, porcentaje } = calculo.precios;

    await conexion.beginTransaction();

    const [resultado] = await conexion.query<ResultSetHeader>(
      `
      UPDATE servicios
      SET
        nombre = ?,
        descripcion = ?,
        tipo_servicio = ?,
        categoria = ?,
        precio = ?,
        porcentaje_descuento = ?,
        precio_original = ?,
        duracion_minutos = ?,
        modalidad = ?,
        activo = ?
      WHERE id = ?
      `,
      [
        v.nombre,
        v.descripcion,
        v.tipo_servicio,
        v.categoria,
        precio,
        porcentaje,
        precioOriginal,
        v.duracion,
        v.modalidad,
        v.activo,
        id,
      ]
    );

    if (resultado.affectedRows === 0) {
      await conexion.rollback();

      return NextResponse.json(
        { error: "El servicio no existe." },
        { status: 404 }
      );
    }

    // Servicios incluidos de esta promoción (o limpiar si ya no lo es)
    await guardarServiciosIncluidos(
      conexion,
      id,
      v.tipo_servicio === "PROMOCION" ? v.incluidos : []
    );

    // Promociones que incluyen este servicio: se actualizan con el
    // precio nuevo. Si dejó de ser un servicio normal, sale de ellas.
    const [dependientes] = await conexion.query<RowDataPacket[]>(
      `
      SELECT DISTINCT promocion_id
      FROM servicio_promocion_items
      WHERE servicio_id = ?
      `,
      [id]
    );

    if (v.tipo_servicio !== "NORMAL") {
      await conexion.query(
        "DELETE FROM servicio_promocion_items WHERE servicio_id = ?",
        [id]
      );
    }

    for (const dependiente of dependientes) {
      await recalcularPromocion(conexion, Number(dependiente.promocion_id));
    }

    await conexion.commit();

    return NextResponse.json({
      mensaje: "Servicio actualizado correctamente.",
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error("Error haciendo rollback:", rollbackError);
      }
    }

    console.error("Error actualizando servicio:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el servicio." },
      { status: 500 }
    );
  } finally {
    conexion?.release();
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

    const [resultado] = await pool.query<ResultSetHeader>(
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