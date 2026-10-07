import { google } from "googleapis";
import pool from "./db";
import crypto from "crypto";

type CrearEventoGoogleParams = {
  fecha: string | Date;
  hora: string | Date;
  duracionMinutos: number;
  nombreCliente: string;
  emailCliente: string;
  nombreServicio: string;
  modalidad: "VIRTUAL" | "PRESENCIAL";
};

type ResultadoEventoGoogle = {
  eventId: string;
  meetLink: string | null;
};

/**
 * Prepara el cliente autenticado de Google Calendar,
 * junto con la configuración guardada (calendar_id).
 * La usan tanto crear como actualizar eventos.
 */
async function obtenerClienteCalendar() {
  const [configuraciones]: any = await pool.query(
    `SELECT refresh_token, calendar_id
     FROM google_calendar_config
     WHERE activo = 1
     ORDER BY id DESC
     LIMIT 1`
  );

  if (!configuraciones.length) {
    throw new Error(
      "No hay una cuenta de Google Calendar conectada."
    );
  }

  const configuracion = configuraciones[0];

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan variables de entorno de Google OAuth."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: configuracion.refresh_token,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  return {
    calendar,
    calendarId: configuracion.calendar_id || "primary",
  };
}

export async function crearEventoGoogleCalendar(
  params: CrearEventoGoogleParams
): Promise<ResultadoEventoGoogle> {
  const { calendar, calendarId } =
    await obtenerClienteCalendar();

  const inicio = construirFechaBogota(
    params.fecha,
    params.hora
  );

  const duracionMinutos = Number(
    params.duracionMinutos
  );

  if (
    !Number.isFinite(duracionMinutos) ||
    duracionMinutos <= 0
  ) {
    throw new Error(
      `Duración inválida para Google Calendar: "${params.duracionMinutos}"`
    );
  }

  const fin = new Date(
    inicio.getTime() +
      duracionMinutos * 60 * 1000
  );

  if (Number.isNaN(fin.getTime())) {
    throw new Error(
      "No fue posible calcular la hora de finalización del evento."
    );
  }

  const requestId = crypto.randomUUID();

  const evento = await calendar.events.insert({
    calendarId,

    conferenceDataVersion: 1,

    sendUpdates: "none",

    requestBody: {
      summary: `Cita psicológica - ${params.nombreCliente}`,

      description: [
        `Servicio: ${params.nombreServicio}`,
        `Cliente: ${params.nombreCliente}`,
        `Correo: ${params.emailCliente}`,
        `Modalidad: ${params.modalidad}`,
      ].join("\n"),

      start: {
        dateTime: formatearFechaBogota(inicio),
        timeZone: "America/Bogota",
      },

      end: {
        dateTime: formatearFechaBogota(fin),
        timeZone: "America/Bogota",
      },

      attendees: params.emailCliente
        ? [
            {
              email: params.emailCliente,
              displayName: params.nombreCliente,
            },
          ]
        : undefined,

      conferenceData: {
        createRequest: {
          requestId,

          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  const eventId = evento.data.id;

  if (!eventId) {
    throw new Error(
      "Google Calendar no devolvió el ID del evento."
    );
  }

  let meetLink =
    evento.data.hangoutLink ||
    extraerMeetLink(
      evento.data.conferenceData
    );

  let ultimoError: unknown;

  for (
    let intento = 0;
    !meetLink && intento < 5;
    intento += 1
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, 300 * (intento + 1))
    );

    try {
      const eventoActualizado =
        await calendar.events.get({
          calendarId,
          eventId,
        });

      meetLink =
        eventoActualizado.data.hangoutLink ||
        extraerMeetLink(
          eventoActualizado.data.conferenceData
        );

      if (
        eventoActualizado.data.conferenceData
          ?.createRequest?.status?.statusCode ===
        "failure"
      ) {
        break;
      }
    } catch (error) {
      ultimoError = error;
    }
  }

  if (!meetLink) {
    console.error(
      "Google Calendar no generó el enlace de Meet para el evento:",
      { eventId, ultimoError }
    );
  }

  return {
    eventId,
    meetLink: meetLink || null,
  };
}

type ActualizarEventoGoogleParams = {
  eventId: string;
  fecha: string | Date;
  hora: string | Date;
  duracionMinutos: number;
};

/**
 * Actualiza la fecha/hora de un evento que ya existe
 * (se usa al reprogramar). El enlace de Google Meet
 * NO cambia: sigue siendo el mismo del evento original.
 */
export async function actualizarEventoGoogleCalendar(
  params: ActualizarEventoGoogleParams
): Promise<{ meetLink: string | null }> {
  const { calendar, calendarId } =
    await obtenerClienteCalendar();

  const inicio = construirFechaBogota(
    params.fecha,
    params.hora
  );

  const duracionMinutos = Number(
    params.duracionMinutos
  );

  if (
    !Number.isFinite(duracionMinutos) ||
    duracionMinutos <= 0
  ) {
    throw new Error(
      `Duración inválida para Google Calendar: "${params.duracionMinutos}"`
    );
  }

  const fin = new Date(
    inicio.getTime() +
      duracionMinutos * 60 * 1000
  );

  const evento = await calendar.events.patch({
    calendarId,
    eventId: params.eventId,

    requestBody: {
      start: {
        dateTime: formatearFechaBogota(inicio),
        timeZone: "America/Bogota",
      },

      end: {
        dateTime: formatearFechaBogota(fin),
        timeZone: "America/Bogota",
      },
    },
  });

  const meetLink =
    evento.data.hangoutLink ||
    extraerMeetLink(evento.data.conferenceData);

  return { meetLink: meetLink || null };
}

/**
 * Construye una fecha válida usando
 * la fecha y hora de Colombia.
 */
function construirFechaBogota(
  fecha: string | Date,
  hora: string | Date
): Date {
  const fechaTexto = obtenerFechaTexto(fecha);

  const horaTexto = obtenerHoraTexto(hora);

  if (!fechaTexto) {
    throw new Error(
      `La fecha de la cita está vacía o es inválida: "${fecha}"`
    );
  }

  if (!horaTexto) {
    throw new Error(
      `La hora de la cita está vacía o es inválida: "${hora}"`
    );
  }

  const fechaCompleta =
    `${fechaTexto}T${horaTexto}-05:00`;

  const resultado = new Date(fechaCompleta);

  if (Number.isNaN(resultado.getTime())) {
    throw new Error(
      `No fue posible convertir la fecha/hora de la cita: ` +
        `fecha="${fechaTexto}", hora="${horaTexto}"`
    );
  }

  return resultado;
}

/**
 * Convierte la fecha recibida desde MySQL
 * a YYYY-MM-DD.
 */
function obtenerFechaTexto(
  fecha: string | Date
): string {
  if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) {
      throw new Error(
        "La fecha recibida desde la base de datos es inválida."
      );
    }

    const partes = new Intl.DateTimeFormat(
      "sv-SE",
      {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(fecha);

    const valores: Record<string, string> = {};

    for (const parte of partes) {
      if (parte.type !== "literal") {
        valores[parte.type] = parte.value;
      }
    }

    if (
      !valores.year ||
      !valores.month ||
      !valores.day
    ) {
      throw new Error(
        "No fue posible obtener la fecha de la cita."
      );
    }

    return (
      `${valores.year}-` +
      `${valores.month}-` +
      `${valores.day}`
    );
  }

  const texto = String(fecha ?? "").trim();

  if (!texto) {
    return "";
  }

  /*
   * Si ya viene como:
   * 2026-09-25
   */
  const coincidencia = texto.match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  if (coincidencia) {
    return coincidencia[1];
  }

  /*
   * Intentamos convertir otros formatos
   * válidos de fecha.
   */
  const fechaConvertida = new Date(texto);

  if (Number.isNaN(fechaConvertida.getTime())) {
    throw new Error(
      `Formato de fecha inválido para Google Calendar: "${texto}"`
    );
  }

  return obtenerFechaTexto(fechaConvertida);
}

/**
 * Convierte la hora recibida desde MySQL
 * a HH:mm:ss.
 */
function obtenerHoraTexto(
  hora: string | Date
): string {
  if (hora instanceof Date) {
    if (Number.isNaN(hora.getTime())) {
      throw new Error(
        "La hora recibida desde la base de datos es inválida."
      );
    }

    return hora
      .toTimeString()
      .slice(0, 8);
  }

  let horaTexto = String(hora ?? "").trim();

  if (!horaTexto) {
    return "";
  }

  /*
   * Si viene:
   * 2026-09-25T13:00:00
   */
  if (horaTexto.includes("T")) {
    horaTexto =
      horaTexto.split("T")[1];
  }

  /*
   * Si viene:
   * 13:00:00.000
   */
  horaTexto =
    horaTexto.split(".")[0];

  /*
   * Si viene:
   * 13:00:00-05:00
   */
  horaTexto =
    horaTexto.split("-")[0];

  /*
   * Si viene:
   * 13:00:00+00:00
   */
  horaTexto =
    horaTexto.split("+")[0];

  /*
   * Si viene:
   * 13:00
   */
  if (
    /^\d{2}:\d{2}$/.test(horaTexto)
  ) {
    horaTexto =
      `${horaTexto}:00`;
  }

  if (
    !/^\d{2}:\d{2}:\d{2}$/.test(
      horaTexto
    )
  ) {
    throw new Error(
      `Formato de hora inválido para Google Calendar: "${horaTexto}"`
    );
  }

  const [
    horas,
    minutos,
    segundos,
  ] = horaTexto
    .split(":")
    .map(Number);

  if (
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59 ||
    segundos < 0 ||
    segundos > 59
  ) {
    throw new Error(
      `Hora inválida para Google Calendar: "${horaTexto}"`
    );
  }

  return horaTexto;
}

/**
 * Formatea una fecha para Google Calendar
 * usando la zona horaria de Bogotá.
 */
function formatearFechaBogota(
  fecha: Date
): string {
  if (
    !(fecha instanceof Date) ||
    Number.isNaN(fecha.getTime())
  ) {
    throw new Error(
      "Se intentó formatear una fecha inválida para Google Calendar."
    );
  }

  const partes =
    new Intl.DateTimeFormat(
      "sv-SE",
      {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).formatToParts(fecha);

  const valores: Record<
    string,
    string
  > = {};

  for (const parte of partes) {
    if (parte.type !== "literal") {
      valores[parte.type] =
        parte.value;
    }
  }

  if (
    !valores.year ||
    !valores.month ||
    !valores.day ||
    !valores.hour ||
    !valores.minute ||
    !valores.second
  ) {
    throw new Error(
      "No fue posible obtener todos los componentes de la fecha para Google Calendar."
    );
  }

  return (
    `${valores.year}-` +
    `${valores.month}-` +
    `${valores.day}` +
    `T${valores.hour}:` +
    `${valores.minute}:` +
    `${valores.second}`
  );
}

/**
 * Obtiene el enlace de Google Meet
 * desde conferenceData.
 */
function extraerMeetLink(
  conferenceData: any
): string | null {
  const entries =
    conferenceData?.entryPoints || [];

  const videoEntry =
    entries.find(
      (entry: any) =>
        entry.entryPointType ===
          "video" &&
        typeof entry.uri ===
          "string"
    );

  return (
    videoEntry?.uri || null
  );
}