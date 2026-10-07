import { NextResponse } from "next/server";

export async function POST() {
  try {
    const respuesta = NextResponse.json({
      mensaje: "Sesión cerrada correctamente.",
    });

    respuesta.cookies.set("admin_session", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return respuesta;
  } catch (error) {
    console.error("Error cerrando sesión:", error);

    return NextResponse.json(
      {
        error: "No se pudo cerrar la sesión.",
      },
      { status: 500 }
    );
  }
}