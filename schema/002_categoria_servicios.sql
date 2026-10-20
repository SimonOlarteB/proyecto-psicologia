USE psicologia;

ALTER TABLE servicios
  ADD COLUMN categoria ENUM('PERSONAS', 'EMPRESAS')
  NOT NULL DEFAULT 'PERSONAS'
  AFTER tipo_servicio;
