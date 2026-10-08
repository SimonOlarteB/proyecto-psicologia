import type { RowDataPacket } from "mysql2";
import pool from "./db";

export interface PublicacionPublica extends RowDataPacket {
  id: number;
  titulo: string;
  resumen: string | null;
  contenido: string;
  imagen_url: string | null;
  estado: "BORRADOR" | "PUBLICADO";
  fecha_publicacion: string | null;
  creado_en: string;
  actualizado_en: string;
}

export async function obtenerPerfilPublico() {
  const [filas] = await pool.query<RowDataPacket[]>(`
    SELECT
      id,
      nombre_profesional,
      profesion,
      descripcion,
      foto_url,
      logo_url,
      whatsapp,
      correo,
      direccion,
      actualizado_en
    FROM configuracion_general
    ORDER BY id ASC
    LIMIT 1
  `);

  return filas[0] || null;
}

export async function obtenerServiciosPublicos() {
  const [filas] = await pool.query<RowDataPacket[]>(`
    SELECT
      id,
      nombre,
      descripcion,
      tipo_servicio,
      precio,
      duracion_minutos,
      modalidad,
      activo,
      creado_en,
      actualizado_en
    FROM servicios
    WHERE activo = 1
    ORDER BY id DESC
  `);

  return filas;
}

export async function obtenerTrayectoriaPublica() {
  const [filas] = await pool.query<RowDataPacket[]>(`
    SELECT
      id,
      tipo,
      titulo,
      institucion,
      descripcion,
      fecha_inicio,
      fecha_fin,
      imagen_url,
      orden,
      activo,
      creado_en,
      actualizado_en
    FROM trayectoria
    WHERE activo = 1
    ORDER BY orden ASC, fecha_inicio DESC, id DESC
  `);

  return filas;
}

export async function obtenerTestimoniosPublicos() {
  const [filas] = await pool.query<RowDataPacket[]>(`
    SELECT
      id,
      nombre,
      comentario,
      publicado,
      creado_en,
      actualizado_en
    FROM testimonios
    WHERE publicado = 1
    ORDER BY id DESC
  `);

  return filas;
}

export async function obtenerPublicacionesPublicas() {
  const [filas] = await pool.query<PublicacionPublica[]>(`
    SELECT
      id,
      titulo,
      resumen,
      contenido,
      imagen_url,
      estado,
      fecha_publicacion,
      creado_en,
      actualizado_en
    FROM publicaciones
    WHERE estado = 'PUBLICADO'
    ORDER BY fecha_publicacion DESC, id DESC
  `);

  return filas;
}

export async function obtenerPublicacionPublica(id: string) {
  const [filas] = await pool.query<PublicacionPublica[]>(
    `
    SELECT
      id,
      titulo,
      resumen,
      contenido,
      imagen_url,
      estado,
      fecha_publicacion,
      creado_en,
      actualizado_en
    FROM publicaciones
    WHERE id = ?
      AND estado = 'PUBLICADO'
    LIMIT 1
    `,
    [id]
  );

  return filas[0] || null;
}
