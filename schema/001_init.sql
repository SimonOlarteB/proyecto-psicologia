-- Esquema inicial para entornos de staging/producción.
-- Charset utf8mb4 y zona horaria de sesión UTC (la app formatea America/Bogota).

CREATE DATABASE IF NOT EXISTS psicologia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE psicologia;

CREATE TABLE IF NOT EXISTS administradores (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_administradores_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_general (
  id INT NOT NULL AUTO_INCREMENT,
  nombre_profesional VARCHAR(190) NOT NULL,
  profesion VARCHAR(190) NOT NULL,
  descripcion TEXT NULL,
  foto_url VARCHAR(500) NULL,
  logo_url VARCHAR(500) NULL,
  whatsapp VARCHAR(40) NULL,
  correo VARCHAR(190) NULL,
  direccion VARCHAR(500) NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicios (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(190) NOT NULL,
  descripcion TEXT NULL,
  tipo_servicio ENUM('NORMAL', 'ESPECIAL') NOT NULL DEFAULT 'NORMAL',
  precio DECIMAL(12, 2) NOT NULL DEFAULT 0,
  duracion_minutos INT NOT NULL DEFAULT 60,
  modalidad ENUM('PRESENCIAL', 'VIRTUAL', 'AMBAS') NOT NULL DEFAULT 'PRESENCIAL',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
  id INT NOT NULL AUTO_INCREMENT,
  nombre_completo VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  acepta_tratamiento_datos TINYINT(1) NOT NULL DEFAULT 0,
  fecha_aceptacion_datos TIMESTAMP NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citas (
  id INT NOT NULL AUTO_INCREMENT,
  cliente_id INT NOT NULL,
  servicio_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  modalidad ENUM('PRESENCIAL', 'VIRTUAL') NOT NULL,
  estado ENUM('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',
  origen_reserva VARCHAR(40) NULL,
  cliente_nombre_registro VARCHAR(190) NULL,
  cliente_telefono_registro VARCHAR(40) NULL,
  google_event_id VARCHAR(255) NULL,
  meet_link VARCHAR(500) NULL,
  token_confirmacion VARCHAR(128) NULL,
  asistencia_confirmada TINYINT(1) NOT NULL DEFAULT 0,
  recordatorio_12h_enviado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_citas_fecha_estado (fecha, estado),
  KEY idx_citas_cliente (cliente_id),
  CONSTRAINT fk_citas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_citas_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos (
  id INT NOT NULL AUTO_INCREMENT,
  cita_id INT NOT NULL,
  referencia VARCHAR(80) NOT NULL,
  transaccion_id VARCHAR(80) NULL,
  monto DECIMAL(12, 2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'COP',
  metodo_pago VARCHAR(80) NULL,
  estado ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  fecha_pago TIMESTAMP NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pagos_referencia (referencia),
  UNIQUE KEY uq_pagos_transaccion (transaccion_id),
  KEY idx_pagos_cita (cita_id),
  CONSTRAINT fk_pagos_cita FOREIGN KEY (cita_id) REFERENCES citas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disponibilidad (
  id INT NOT NULL AUTO_INCREMENT,
  dia_semana TINYINT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_disponibilidad_dia (dia_semana, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disponibilidad_especial (
  id INT NOT NULL AUTO_INCREMENT,
  fecha DATE NOT NULL,
  hora_inicio TIME NULL,
  hora_fin TIME NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_disponibilidad_especial_fecha (fecha, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bloqueos_agenda (
  id INT NOT NULL AUTO_INCREMENT,
  inicio DATETIME NOT NULL,
  fin DATETIME NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bloqueos_agenda_activo_intervalo (activo, inicio, fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trayectoria (
  id INT NOT NULL AUTO_INCREMENT,
  tipo VARCHAR(80) NOT NULL,
  titulo VARCHAR(190) NOT NULL,
  institucion VARCHAR(190) NULL,
  descripcion TEXT NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  imagen_url VARCHAR(500) NULL,
  orden INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publicaciones (
  id INT NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(220) NOT NULL,
  resumen TEXT NULL,
  contenido MEDIUMTEXT NOT NULL,
  imagen_url VARCHAR(500) NULL,
  estado ENUM('BORRADOR', 'PUBLICADO') NOT NULL DEFAULT 'BORRADOR',
  fecha_publicacion DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonios (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(190) NOT NULL,
  comentario TEXT NOT NULL,
  publicado TINYINT(1) NOT NULL DEFAULT 0,
  cita_id INT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_testimonios_publicado (publicado),
  CONSTRAINT fk_testimonios_cita FOREIGN KEY (cita_id) REFERENCES citas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitudes_testimonio (
  id INT NOT NULL AUTO_INCREMENT,
  cita_id INT NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  estado ENUM('PENDIENTE', 'ENVIADA', 'ERROR', 'RESPONDIDA') NOT NULL DEFAULT 'PENDIENTE',
  intentos INT NOT NULL DEFAULT 0,
  token_expira_en TIMESTAMP NULL,
  enviado_en TIMESTAMP NULL,
  ultimo_error VARCHAR(1000) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_solicitudes_testimonio_cita (cita_id),
  CONSTRAINT fk_solicitudes_testimonio_cita FOREIGN KEY (cita_id) REFERENCES citas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS google_calendar_config (
  id INT NOT NULL AUTO_INCREMENT,
  email_google VARCHAR(190) NOT NULL,
  refresh_token TEXT NOT NULL,
  calendar_id VARCHAR(190) NOT NULL DEFAULT 'primary',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
