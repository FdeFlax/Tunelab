CREATE TABLE usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  identificador_uacloud VARCHAR(100) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(160),
  rol ENUM('alumno', 'profesor', 'tecnico', 'admin') DEFAULT 'alumno',
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ensayos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL,
  objetivo VARCHAR(160),
  descripcion TEXT,
  usuario_id BIGINT NOT NULL,
  estado ENUM('preparado', 'activo', 'cerrado', 'archivado') DEFAULT 'preparado',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ensayos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE mediciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ensayo_id BIGINT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  estado ENUM('preparada', 'en_curso', 'finalizada', 'cancelada', 'error') DEFAULT 'preparada',
  velocidad_objetivo DECIMAL(6,2),
  potencia_objetivo DECIMAL(5,2),
  temperatura_objetivo DECIMAL(5,2),
  fecha_inicio DATETIME,
  fecha_fin DATETIME,
  duracion_segundos INT,
  velocidad_media DECIMAL(6,2),
  velocidad_maxima DECIMAL(6,2),
  velocidad_minima DECIMAL(6,2),
  temperatura_media DECIMAL(6,2),
  potencia_media DECIMAL(6,2),
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mediciones_ensayo FOREIGN KEY (ensayo_id) REFERENCES ensayos(id)
);

CREATE TABLE muestras_medicion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  medicion_id BIGINT NOT NULL,
  instante DATETIME NOT NULL,
  velocidad_ms DECIMAL(8,3),
  temperatura_c DECIMAL(6,2),
  potencia_porcentaje DECIMAL(5,2),
  frecuencia_hz DECIMAL(6,2),
  corriente_a DECIMAL(6,2),
  rpm INT,
  CONSTRAINT fk_muestras_medicion FOREIGN KEY (medicion_id) REFERENCES mediciones(id)
);

CREATE TABLE eventos_medicion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  medicion_id BIGINT,
  ensayo_id BIGINT,
  tipo ENUM('info', 'advertencia', 'error', 'seguridad', 'sistema') DEFAULT 'info',
  mensaje TEXT NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eventos_medicion FOREIGN KEY (medicion_id) REFERENCES mediciones(id),
  CONSTRAINT fk_eventos_ensayo FOREIGN KEY (ensayo_id) REFERENCES ensayos(id)
);

CREATE TABLE comandos_tunel (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT,
  ensayo_id BIGINT,
  medicion_id BIGINT,
  comando ENUM('encender', 'apagar', 'iniciar_medicion', 'detener_medicion', 'ajustar_potencia') NOT NULL,
  valor VARCHAR(100),
  resultado ENUM('pendiente', 'ejecutado', 'rechazado', 'error') DEFAULT 'pendiente',
  mensaje_resultado TEXT,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comandos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_comandos_ensayo FOREIGN KEY (ensayo_id) REFERENCES ensayos(id),
  CONSTRAINT fk_comandos_medicion FOREIGN KEY (medicion_id) REFERENCES mediciones(id)
);

CREATE TABLE informes_medicion (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  medicion_id BIGINT NOT NULL,
  tipo ENUM('json', 'csv', 'pdf', 'excel') NOT NULL,
  nombre_archivo VARCHAR(180) NOT NULL,
  ruta_archivo VARCHAR(300),
  generado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_informes_medicion FOREIGN KEY (medicion_id) REFERENCES mediciones(id)
);

CREATE INDEX idx_ensayos_usuario ON ensayos(usuario_id);
CREATE INDEX idx_mediciones_ensayo ON mediciones(ensayo_id);
CREATE INDEX idx_muestras_medicion ON muestras_medicion(medicion_id);
CREATE INDEX idx_eventos_medicion ON eventos_medicion(medicion_id);
CREATE INDEX idx_comandos_usuario ON comandos_tunel(usuario_id);
