import { Resend } from "resend";

let cliente: Resend | null = null;

// Se crea bajo demanda: new Resend(undefined) lanza error
// y se evaluaría durante next build.
function obtenerResend(): Resend {
  const clave = process.env.RESEND_API_KEY;

  if (!clave) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  if (!cliente) {
    cliente = new Resend(clave);
  }

  return cliente;
}

// Se resuelve por solicitud: un throw a nivel de módulo
// se evaluaría durante next build y rompería el build.
function obtenerRemitente(): string {
  const remitente = process.env.RESEND_FROM_EMAIL;

  if (!remitente) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_FROM_EMAIL no está configurada. Verifica tu dominio en Resend antes de desplegar."
      );
    }

    // Solo en desarrollo se permite el remitente de prueba de Resend.
    return "onboarding@resend.dev";
  }

  return remitente;
}

export async function enviarCorreo({
  para,
  asunto,
  html,
}: {
  para: string;
  asunto: string;
  html: string;
}) {
  const resend = obtenerResend();

  const { data, error } = await resend.emails.send({
    from: obtenerRemitente(),
    to: [para],
    subject: asunto,
    html,
  });

  if (error) {
    console.error("Error enviando correo con Resend:", error);

    throw new Error(
      error.message || "No fue posible enviar el correo."
    );
  }

  return data;
}