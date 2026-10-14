import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "../../../lib/db";

export const runtime = "nodejs";

const estadosPago = [
  "PENDIENTE",
  "APROBADO",
  "RECHAZADO",
  "CANCELADO",
] as const;

type EstadoPago = (typeof estadosPago)[number];

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id || id.length > 80) {
    return NextResponse.json(
      { error: "El identificador de la transacción no es válido." },
      { status: 400 }
    );
  }

  try {
    const [pagos] = await pool.query<RowDataPacket[]>(
      `
        SELECT estado
        FROM pagos
        WHERE transaccion_id = ?
        LIMIT 1
      `,
      [id]
    );

    const estado = pagos[0]?.estado;

    if (
      estado !== undefined &&
      !estadosPago.includes(estado as EstadoPago)
    ) {
      throw new Error("El pago tiene un estado desconocido.");
    }

    return NextResponse.json(
      { estado: (estado as EstadoPago | undefined) ?? "PENDIENTE" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error consultando el estado del pago:", error);

    return NextResponse.json(
      { error: "No fue posible consultar el estado del pago." },
      { status: 500 }
    );
  }
}
