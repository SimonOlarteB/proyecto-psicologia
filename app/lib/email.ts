import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const REMITENTE =
  process.env.RESEND_FROM_EMAIL ||
  "onboarding@resend.dev";

export async function enviarCorreo({
  para,
  asunto,
  html,
}: {
  para: string;
  asunto: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY no está configurada."
    );
  }

  const { data, error } =
    await resend.emails.send({
      from: REMITENTE,
      to: [para],
      subject: asunto,
      html,
    });

  if (error) {
    console.error(
      "Error enviando correo con Resend:",
      error
    );

    throw new Error(
      error.message ||
        "No fue posible enviar el correo."
    );
  }

  return data;
}