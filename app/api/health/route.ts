import { NextResponse } from "next/server";
import pool from "../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");

    return NextResponse.json({
      ok: true,
      estado: "listo",
    });
  } catch (error) {
    console.error("Healthcheck falló:", error);

    return NextResponse.json(
      {
        ok: false,
        estado: "error",
      },
      { status: 503 }
    );
  }
}
