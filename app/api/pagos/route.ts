import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "./../../lib/db";
import { verificarSesion } from "./../../lib/auth";
import { obtenerAppUrl } from "./../../lib/app-url";
import {
  agregarDiasAFecha,
  citaOcupaFecha,
  esDuracionEnDias,
  horariosSeCruzan,
  obtenerFechasHabiles,
} from "./../../lib/horarios";
import {
  ipDelCliente,
  permitirIntento,
} from "./../../lib/rate-limit";

type CitaOcupada = RowDataPacket & {
  fecha: string;
  hora: string;
  duracion_minutos: number;
};

async function obtenerSesionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  return verificarSesion(token);
}

// ======================================================
// GET — CONSULTAR PAGOS
// ======================================================

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

    const estado = searchParams.get("estado");

    let consulta = `
      SELECT
        p.id,
        p.cita_id,
        p.referencia,
        p.transaccion_id,
        p.monto,
        p.moneda,
        p.metodo_pago,
        p.estado,
        p.fecha_pago,
        p.creado_en,
        p.actualizado_en,

        c.fecha AS cita_fecha,
        c.hora AS cita_hora,
        c.modalidad AS cita_modalidad,
        c.estado AS cita_estado,

        cl.nombre_completo AS cliente_nombre,
        cl.email AS cliente_email,
        cl.telefono AS cliente_telefono,

        s.nombre AS servicio_nombre

      FROM pagos p

      INNER JOIN citas c
        ON p.cita_id = c.id

      INNER JOIN clientes cl
        ON c.cliente_id = cl.id

      INNER JOIN servicios s
        ON c.servicio_id = s.id
    `;

    const parametros: string[] = [];

    if (
      estado &&
      ["PENDIENTE", "APROBADO", "RECHAZADO", "CANCELADO"].includes(
        estado
      )
    ) {
      consulta += `
        WHERE p.estado = ?
      `;

      parametros.push(estado);
    }

    consulta += `
      ORDER BY
        p.creado_en DESC,
        p.id DESC
    `;

    const [pagos] = await pool.query<RowDataPacket[]>(
      consulta,
      parametros
    );

    return NextResponse.json(pagos);
  } catch (error) {
    console.error("Error consultando pagos:", error);

    return NextResponse.json(
      {
        error: "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// POST — CREAR CITA + PAGO PENDIENTE
// ======================================================

export async function POST(request: Request) {
  const conexion = await pool.getConnection();

  try {
    // Protección contra abuso de pagos:
    // 20 solicitudes por IP cada hora.
    const ip = ipDelCliente(request);

    if (!permitirIntento(`pagos:${ip}`, 20, 60 * 60 * 1000)) {
      // El finally libera la conexión.
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Inténtalo en unos minutos.",
        },
        { status: 429 }
      );
    }

    const datos = await request.json();

    const {
      nombre_completo,
      email,
      telefono,
      acepta_tratamiento_datos,
      servicio_id,
      fecha,
      hora,
      modalidad,
    } = datos;

    // ====================================================
    // VALIDACIONES
    // ====================================================

    if (
      !nombre_completo ||
      !email ||
      !telefono ||
      !servicio_id ||
      !fecha ||
      !hora ||
      !modalidad ||
      !acepta_tratamiento_datos
    ) {
      return NextResponse.json(
        {
          error: "Todos los campos son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (!["PRESENCIAL", "VIRTUAL"].includes(modalidad)) {
      return NextResponse.json(
        {
          error: "Modalidad no válida.",
        },
        { status: 400 }
      );
    }

    // ====================================================
    // CONFIGURACIÓN WOMPI
    // ====================================================

    const wompiPublicKey =
      process.env.WOMPI_PUBLIC_KEY;

    const wompiIntegritySecret =
      process.env.WOMPI_INTEGRITY_SECRET;

    if (!wompiPublicKey || !wompiIntegritySecret) {
      console.error(
        "Faltan WOMPI_PUBLIC_KEY o WOMPI_INTEGRITY_SECRET."
      );

      return NextResponse.json(
        {
          error:
            "La configuración de pagos todavía no está completa.",
        },
        { status: 500 }
      );
    }

    // ====================================================
    // SERVICIO
    // ====================================================

    const [servicios] = await conexion.query<RowDataPacket[]>(
      `
      SELECT
        id,
        nombre,
        precio,
        modalidad,
        tipo_servicio,
        duracion_minutos
      FROM servicios
      WHERE id = ?
        AND activo = 1
      LIMIT 1
      `,
      [servicio_id]
    );

    if (servicios.length === 0) {
      return NextResponse.json(
        {
          error:
            "El servicio seleccionado no existe o está inactivo.",
        },
        { status: 400 }
      );
    }

    const servicio = servicios[0];
    const duracionServicio = Number(servicio.duracion_minutos) || 60;
    const servicioPorDias = esDuracionEnDias(duracionServicio);
    const fechasServicio = servicioPorDias
      ? obtenerFechasHabiles(fecha, duracionServicio / 1440)
      : [fecha];

    if (servicioPorDias && fechasServicio[0] !== fecha) {
      return NextResponse.json(
        { error: "Los servicios por días deben iniciar en un día hábil." },
        { status: 409 }
      );
    }

    if (servicio.tipo_servicio === "ESPECIAL") {
      return NextResponse.json(
        {
          error:
            "Este servicio se cotiza por WhatsApp y no admite pago en línea.",
        },
        { status: 400 }
      );
    }

    // ====================================================
    // VALIDAR MODALIDAD DEL SERVICIO
    // ====================================================

    const modalidadPermitida =
      servicio.modalidad === "AMBAS" ||
      servicio.modalidad === modalidad;

    if (!modalidadPermitida) {
      return NextResponse.json(
        {
          error:
            "La modalidad seleccionada no está disponible para este servicio.",
        },
        { status: 400 }
      );
    }

    // ====================================================
    // VALIDAR HORARIO
    // ====================================================

    const ultimaFechaServicio = fechasServicio[fechasServicio.length - 1];
    const [citasExistentes] =
      await conexion.query<CitaOcupada[]>(
        `
        SELECT DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
          TIME_FORMAT(c.hora, '%H:%i') AS hora, s.duracion_minutos
        FROM citas c
        INNER JOIN servicios s ON c.servicio_id = s.id
        WHERE c.fecha >= DATE_SUB(?, INTERVAL 365 DAY)
          AND c.fecha <= ?
          AND c.estado IN ('PENDIENTE', 'CONFIRMADA')
        `,
        [fecha, ultimaFechaServicio]
      );

    const reservaDeDiaCompletoOcupada = servicioPorDias
      ? fechasServicio.some((fechaServicio) =>
          citasExistentes.some((cita) =>
            citaOcupaFecha(
              {
                fecha: String(cita.fecha),
                duracion_minutos: Number(cita.duracion_minutos),
              },
              fechaServicio
            )
          )
        )
      : citasExistentes.some(
          (cita) =>
            citaOcupaFecha(
              {
                fecha: String(cita.fecha),
                duracion_minutos: Number(cita.duracion_minutos),
              },
              fecha
            ) &&
            (String(cita.fecha) !== fecha ||
              esDuracionEnDias(Number(cita.duracion_minutos)))
        );
    const duracionParaCruce = servicioPorDias ? 60 : duracionServicio;
    const hayCruce =
      reservaDeDiaCompletoOcupada ||
      citasExistentes.some(
        (cita) =>
          String(cita.fecha) === fecha &&
          horariosSeCruzan(
            hora,
            duracionParaCruce,
            String(cita.hora),
            Number(cita.duracion_minutos)
          )
      );

    if (hayCruce) {
      return NextResponse.json(
        {
          error:
            "El horario seleccionado se cruza con otra cita.",
        },
        { status: 409 }
      );
    }

    const [bloqueos] = servicioPorDias
      ? await conexion.query<RowDataPacket[]>(
          `
          SELECT DATE_FORMAT(inicio, '%Y-%m-%dT%H:%i') AS inicio,
            DATE_FORMAT(fin, '%Y-%m-%dT%H:%i') AS fin
          FROM bloqueos_agenda
          WHERE activo = 1
            AND inicio < DATE_ADD(?, INTERVAL 1 DAY)
            AND fin > ?
          `,
          [ultimaFechaServicio, fecha]
        )
      : await conexion.query<RowDataPacket[]>(
          `
          SELECT id
          FROM bloqueos_agenda
          WHERE activo = 1
            AND inicio < DATE_ADD(CONCAT(?, ' ', ?, ':00'), INTERVAL ? MINUTE)
            AND fin > CONCAT(?, ' ', ?, ':00')
          LIMIT 1
          `,
          [
            fecha,
            hora,
            duracionParaCruce,
            fecha,
            hora,
          ]
        );

    const hayBloqueo = servicioPorDias
      ? fechasServicio.some((fechaServicio) => {
          const finDelDia = agregarDiasAFecha(fechaServicio, 1);

          return bloqueos.some((bloqueo) =>
            String(bloqueo.inicio) < `${finDelDia}T00:00` &&
            String(bloqueo.fin) > `${fechaServicio}T00:00`
          );
        })
      : bloqueos.length > 0;

    if (hayBloqueo) {
      return NextResponse.json(
        { error: "El horario seleccionado está dentro de un bloqueo de agenda." },
        { status: 409 }
      );
    }

    // ====================================================
    // PRECIO
    // ====================================================
    //
    // En las promociones, el precio guardado del servicio ya
    // incluye el descuento, por eso es el mismo que se cobra.
    // ====================================================

    const monto = Number(servicio.precio);

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        {
          error:
            "El servicio seleccionado no tiene un precio válido.",
        },
        { status: 400 }
      );
    }

    // Wompi trabaja los valores en centavos.
    const montoEnCentavos = Math.round(monto * 100);

    // ====================================================
    // REFERENCIA ÚNICA
    // ====================================================

    const referencia =
      `CITA-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

    // ====================================================
    // EXPIRACIÓN DEL CHECKOUT
    // ====================================================
    //
    // El cliente tendrá 15 minutos para iniciar el pago.
    //
    // Wompi recibe esta fecha en formato ISO8601 UTC.
    //
    // IMPORTANTE:
    // Cuando utilizamos expiration-time, Wompi exige
    // incluir esta fecha dentro de la firma de integridad.
    // ====================================================

    const expirationTime = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString();

    // ====================================================
    // TRANSACCIÓN MYSQL
    // ====================================================

    await conexion.beginTransaction();

    // ====================================================
    // BUSCAR CLIENTE
    // ====================================================

    const [clientes] = await conexion.query<RowDataPacket[]>(
      `
      SELECT id
      FROM clientes
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    let clienteId: number;

    if (clientes.length > 0) {
      clienteId = clientes[0].id;

      await conexion.query(
        `
        UPDATE clientes
        SET
          nombre_completo = ?,
          telefono = ?,
          acepta_tratamiento_datos = 1,
          fecha_aceptacion_datos = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          nombre_completo,
          telefono,
          clienteId,
        ]
      );
    } else {
      const [resultadoCliente] =
        await conexion.query<ResultSetHeader>(
          `
          INSERT INTO clientes (
            nombre_completo,
            email,
            telefono,
            acepta_tratamiento_datos,
            fecha_aceptacion_datos
          )
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
          `,
          [
            nombre_completo,
            email,
            telefono,
          ]
        );

      clienteId = resultadoCliente.insertId;
    }

    // ====================================================
    // CREAR CITA
    // ====================================================

    const [resultadoCita] =
      await conexion.query<ResultSetHeader>(
        `
        INSERT INTO citas (
          cliente_id,
          servicio_id,
          fecha,
          hora,
          modalidad,
          estado,
          origen_reserva,
          cliente_nombre_registro,
          cliente_telefono_registro
        )
        VALUES (?, ?, ?, ?, ?, 'PENDIENTE', 'WEB', ?, ?)
        `,
        [
          clienteId,
          servicio_id,
          fecha,
          hora,
          modalidad,
          nombre_completo,
          telefono,
        ]
      );

    const citaId = resultadoCita.insertId;

    // ====================================================
    // CREAR PAGO PENDIENTE
    // ====================================================

    await conexion.query(
      `
      INSERT INTO pagos (
        cita_id,
        referencia,
        monto,
        moneda,
        estado
      )
      VALUES (?, ?, ?, 'COP', 'PENDIENTE')
      `,
      [
        citaId,
        referencia,
        monto,
      ]
    );

    await conexion.commit();

    // ====================================================
    // FIRMA DE INTEGRIDAD WOMPI
    // ====================================================
    //
    // Como utilizamos expiration-time, la cadena debe ser:
    //
    // referencia
    // + monto en centavos
    // + moneda
    // + fecha de expiración
    // + secreto de integridad
    //
    // Wompi:
    // <Referencia><Monto><Moneda><FechaExpiracion><Secreto>
    // ====================================================

    const cadenaFirma =
      `${referencia}${montoEnCentavos}COP${expirationTime}${wompiIntegritySecret}`;

    const firmaIntegridad =
      crypto
        .createHash("sha256")
        .update(cadenaFirma)
        .digest("hex");

    // ====================================================
    // CREAR URL DE CHECKOUT
    // ====================================================
    //
    // Mantenemos solamente los parámetros que ya sabemos
    // que funcionan correctamente con nuestro Checkout.
    //
    // Agregamos únicamente expiration-time.
    // ====================================================

    const parametrosCheckout =
      new URLSearchParams({
        "public-key": wompiPublicKey,
        currency: "COP",
        "amount-in-cents":
          String(montoEnCentavos),
        reference: referencia,
        "signature:integrity":
          firmaIntegridad,
        "expiration-time":
          expirationTime,
        "redirect-url":
          `${obtenerAppUrl()}/pago/resultado`,
      });

    const checkoutUrl =
      `https://checkout.wompi.co/p/?${parametrosCheckout.toString()}`;

    // ====================================================
    // RESPUESTA
    // ====================================================

    return NextResponse.json(
      {
        mensaje:
          "Cita y pago creados correctamente.",
        cita_id: citaId,
        cliente_id: clienteId,
        referencia,
        monto,
        moneda: "COP",
        checkout_url: checkoutUrl,
        expiration_time: expirationTime,
      },
      { status: 201 }
    );

  } catch (error) {
    try {
      await conexion.rollback();
    } catch (rollbackError) {
      console.error(
        "Error haciendo rollback:",
        rollbackError
      );
    }

    console.error(
      "Error creando cita y pago:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible crear la reserva y el pago.",
      },
      { status: 500 }
    );

  } finally {
    conexion.release();
  }
}