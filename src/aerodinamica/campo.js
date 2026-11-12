// X: dirección del flujo; Y: altura; Z: ancho.
export const ORIENTACIONES = Object.freeze({
  vertical: {
    nombre: 'Vertical',
    normal: 2,
    u: 0,
    v: 1,
    eje: 'ancho'
  },
  horizontal: {
    nombre: 'Horizontal',
    normal: 1,
    u: 0,
    v: 2,
    eje: 'altura'
  },
  transversal: {
    nombre: 'Transversal',
    normal: 0,
    u: 2,
    v: 1,
    eje: 'longitud'
  }
});
export function leerCampo(volume, configuracion) {
  const { malla: shape, origenCm: origin, pasoCm: step } = configuracion;
  const bytes = shape.reduce((p, n) => p * n, 1) * 4;
  if (volume?.formato !== 'rapidez-f32le-xyz-v1' || volume.paso_cm !== step || !Array.isArray(volume.malla) || volume.malla.length !== 3 || volume.malla.some((n, i) => n !== shape[i]) || !Array.isArray(volume.origen_cm) || volume.origen_cm.length !== 3 || volume.origen_cm.some((n, i) => n !== origin[i]) || typeof volume.datos !== 'string' || volume.datos.length !== 4 * Math.ceil(bytes / 3)) throw new Error('El volumen recibido está incompleto o no es compatible.');
  const raw = atob(volume.datos);
  if (raw.length !== bytes) throw new Error('El volumen recibido está incompleto.');
  const binary = Uint8Array.from(raw, c => c.charCodeAt(0));
  const view = new DataView(binary.buffer),
    values = new Float32Array(bytes / 4);
  for (let i = 0; i < values.length; i++) {
    const value = view.getFloat32(i * 4, true);
    if (!Number.isFinite(value) || value !== -1 && (value < 0 || value > 15)) throw new Error('El volumen contiene valores inválidos.');
    values[i] = value;
  }
  return {
    shape,
    origin,
    step,
    values
  };
}
export function limitesPlano(field, orientation) {
  const axes = ORIENTACIONES[orientation];
  if (!axes) throw new Error('Orientación de plano desconocida.');
  const min = field.origin[axes.normal];
  return {
    min,
    max: min + (field.shape[axes.normal] - 1) * field.step,
    step: field.step
  };
}
export function cortarCampo(field, orientation, position) {
  const {
    min,
    max,
    step
  } = limitesPlano(field, orientation);
  const indice = Math.round((position - min) / step);
  if (!Number.isFinite(position) || position < min - 1e-7 || position > max + 1e-7 || Math.abs((position - min) / step - indice) > 1e-7) throw new Error('El plano debe coincidir con una posición de la malla.');
  const axes = ORIENTACIONES[orientation];
  const width = field.shape[axes.u],
    height = field.shape[axes.v];
  const xyz = [0, 0, 0];
  xyz[axes.normal] = indice;
  const speed_ratio = Array.from({
    length: height
  }, (_, v) => {
    xyz[axes.v] = v;
    return Array.from({
      length: width
    }, (_, u) => {
      xyz[axes.u] = u;
      const value = field.values[(xyz[0] * field.shape[1] + xyz[1]) * field.shape[2] + xyz[2]];
      return value === -1 ? null : value;
    });
  });
  return {
    width,
    height,
    speed_ratio,
    orientation,
    position,
    widthCm: (width - 1) * step,
    heightCm: (height - 1) * step
  };
}
