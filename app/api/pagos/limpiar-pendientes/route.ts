import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import pool from "./../../../lib/db";
import { verificarSesion } from "./../../../lib/auth";

// ======================================================
// LIMPIAR PAGOS PENDIENTES VENCIDOS
// ======================================================

async function limpiarPagosPendientes() {
  try {
    // ====================================================
    // VALIDAR SESIÓN ADMINISTRATIVA
    // ====================================================

    const cookieStore = await cookies();

    const token = cookieStore.get("admin_session")?.value;

    const sesion = verificarSesion(token);

    if (!sesion) {
      return NextResponse.json(
        {
          error: "No autorizado. Debes iniciar sesión como administrador.",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================================
    // OBTENER CONEXIÓN
    // ====================================================

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // ==================================================
      // BUSCAR PAGOS PENDIENTES VENCIDOS
      // ==================================================

      const [pagosVencidos]: any = await conexion.query(`
        SELECT
          p.id AS pago_id,
          p.cita_id,
          p.referencia,
          p.creado_en
        FROM pagos p
        WHERE p.estado = 'PENDIENTE'
          AND p.creado_en <= DATE_SUB(
            CURRENT_TIMESTAMP,
            INTERVAL 15 MINUTE
          )
      `);

      // ==================================================
      // SI NO HAY PAGOS VENCIDOS
      // ==================================================

      if (pagosVencidos.length === 0) {
        await conexion.commit();

        return NextResponse.json({
          ok: true,
          mensaje: "No hay pagos pendientes vencidos.",
          cantidad: 0,
          pagos_cancelados: [],
          citas_canceladas: [],
        });
      }

      // ==================================================
      // OBTENER IDS
      // ==================================================

      const pagoIds = pagosVencidos.map(
        (pago: any) => pago.pago_id
      );

      const citaIds = [
        ...new Set(
          pagosVencidos.map(
            (pago: any) => pago.cita_id
          )
        ),
      ];

      // ==================================================
      // CANCELAR PAGOS
      // ==================================================

      const placeholdersPagos = pagoIds
        .map(() => "?")
        .join(",");

      const [resultadoPagos]: any =
        await conexion.query(
          `
          UPDATE pagos
          SET
            estado = 'CANCELADO',
            actualizado_en = CURRENT_TIMESTAMP
          WHERE id IN (${placeholdersPagos})
            AND estado = 'PENDIENTE'
          `,
          pagoIds
        );

      // ==================================================
      // CANCELAR CITAS
      // ==================================================

      const placeholdersCitas = citaIds
        .map(() => "?")
        .join(",");

      const [resultadoCitas]: any =
        await conexion.query(
          `
          UPDATE citas
          SET
            estado = 'CANCELADA',
            actualizado_en = CURRENT_TIMESTAMP
          WHERE id IN (${placeholdersCitas})
            AND estado = 'PENDIENTE'
          `,
          citaIds
        );

      // ==================================================
      // CONFIRMAR TRANSACCIÓN
      // ==================================================

      await conexion.commit();

      // ==================================================
      // RESPUESTA
      // ==================================================

      return NextResponse.json({
        ok: true,
        mensaje:
          "Pagos y citas vencidas cancelados correctamente.",
        cantidad: resultadoPagos.affectedRows,
        pagos_cancelados: pagoIds,
        citas_canceladas: citaIds,
        detalles: pagosVencidos.map((pago: any) => ({
          pago_id: pago.pago_id,
          cita_id: pago.cita_id,
          referencia: pago.referencia,
          creado_en: pago.creado_en,
        })),
      });

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error(
      "Error limpiando pagos pendientes:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No fue posible limpiar los pagos pendientes.",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// POST
// ======================================================

export async function POST() {
  return limpiarPagosPendientes();
}

// ======================================================
// GET
// ======================================================
// TEMPORALMENTE HABILITADO PARA HACER LA PRUEBA
// DESDE EL NAVEGADOR SIN USAR LA CONSOLA.
// ======================================================

