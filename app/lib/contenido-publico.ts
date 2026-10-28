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

export type CategoriaServicio = "PERSONAS" | "EMPRESAS";

export interface ServicioPublico extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo_servicio: "NORMAL" | "ESPECIAL" | "PROMOCION";
  categoria: CategoriaServicio;
  precio: number;
  precio_original: number | null;
  porcentaje_descuento: number | null;
  duracion_minutos: number;
  modalidad: "PRESENCIAL" | "VIRTUAL" | "AMBAS";
  activo: number;
  incluye?: string | null;
}

export interface PromocionPublica extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precio_original: number | null;
  porcentaje_descuento: number | null;
  duracion_minutos: number;
  modalidad: "PRESENCIAL" | "VIRTUAL" | "AMBAS";
  incluye: string | null;
}

export async function obtenerPerfilPublico() {
  const [filas] = await pool.query<RowDataPacket[]>(`
    SELECT
      id,
      nombre_profesional,
      profesion,
      descripcion,
      foto_url,
      foto_sobre_mi_url,
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

export async function obtenerServiciosPublicos(
  categoria?: CategoriaServicio
): Promise<ServicioPublico[]> {
  const [filas] = await pool.query<ServicioPublico[]>(
  `
  SELECT
    id,
    nombre,
    descripcion,
    tipo_servicio,
    categoria,
    precio,
    precio_original,
    porcentaje_descuento,
    duracion_minutos,
    modalidad,
    activo,
    creado_en,
    actualizado_en,
    (
      SELECT GROUP_CONCAT(inc.nombre ORDER BY inc.nombre SEPARATOR ' + ')
      FROM servicio_promocion_items i
      INNER JOIN servicios inc ON inc.id = i.servicio_id
      WHERE i.promocion_id = servicios.id
    ) AS incluye
  FROM servicios
  WHERE activo = 1
    AND (? IS NULL OR categoria = ?)
  ORDER BY id DESC
  `,
  [categoria ?? null, categoria ?? null]
);

  return filas;
}

export async function obtenerServicioPublico(id: number) {
 const [filas] = await pool.query<ServicioPublico[]>(
  `
  SELECT
    id,
    nombre,
    descripcion,
    tipo_servicio,
    categoria,
    precio,
    precio_original,
    porcentaje_descuento,
    duracion_minutos,
    modalidad,
    activo,
    (
      SELECT GROUP_CONCAT(inc.nombre ORDER BY inc.nombre SEPARATOR ' + ')
      FROM servicio_promocion_items i
      INNER JOIN servicios inc ON inc.id = i.servicio_id
      WHERE i.promocion_id = servicios.id
    ) AS incluye
  FROM servicios
  WHERE id = ? AND activo = 1
  LIMIT 1
  `,
  [id]
);

  return filas[0] ?? null;
}

// Promociones (servicios de tipo PROMOCION) activas para la página de inicio.
// Si las columnas nuevas aún no existen o la consulta falla, devuelve una
// lista vacía para no afectar el resto de la página.
export async function obtenerPromocionesPublicas(): Promise<
  PromocionPublica[]
> {
  try {
    const [filas] = await pool.query<PromocionPublica[]>(`
      SELECT
        s.id,
        s.nombre,
        s.descripcion,
        s.precio,
        s.precio_original,
        s.porcentaje_descuento,
        s.duracion_minutos,
        s.modalidad,
        (
          SELECT GROUP_CONCAT(inc.nombre ORDER BY inc.nombre SEPARATOR ' + ')
          FROM servicio_promocion_items i
          INNER JOIN servicios inc ON inc.id = i.servicio_id
          WHERE i.promocion_id = s.id
        ) AS incluye
      FROM servicios s
      WHERE s.activo = 1
        AND s.tipo_servicio = 'PROMOCION'
        AND s.categoria = 'PERSONAS'
      ORDER BY s.id DESC
    `);

    return filas;
  } catch (error) {
    console.error("Error cargando promociones:", error);
    return [];
  }
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
    ORDER BY
  orden ASC,
  FIELD(tipo, 'TITULO', 'DIPLOMADO', 'CERTIFICACION', 'CURSO'),
  fecha_inicio DESC,
  id DESC
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