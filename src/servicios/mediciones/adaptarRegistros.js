import { calcularMagnitudesDerivadas } from "../tunel/fichaTunel.js";
import { calcularMedia, formatearFecha, formatearHora, formatearFechaHora, redondear } from "../formato.js";
import { crearTrazas, resumirValores } from "./analisisMedicion.js";

const numero = valor => valor == null ? null : Number(valor);
const redondearOpcional = valor => valor == null ? null : redondear(valor);

function resumirSerie(valores, media, maxima, minima) {
  const calculado = resumirValores(valores);
  return {
    media: redondearOpcional(media ?? calculado.media),
    maxima: redondearOpcional(maxima ?? calculado.maxima),
    minima: redondearOpcional(minima ?? calculado.minima),
  };
}

export function instanteApiMs(valor) {
  if (!valor) return NaN;
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(valor) ? valor : `${valor}Z`);
}

function convertirMedicion(medicion, muestrasApi, eventosApi, docente) {
  if (!medicion) return null;
  const inicio = instanteApiMs(medicion.fecha_inicio || muestrasApi[0]?.instante);
  const muestras = muestrasApi.map((muestra, indice) => {
    const velMs = muestra.velocidad_ms == null ? null : Number(muestra.velocidad_ms);
    const magnitudes = velMs == null ? {} : calcularMagnitudesDerivadas({ velocidadMs: velMs });
    return {
      segundo: Number.isFinite(inicio) && muestra.instante ? Math.max(0, (instanteApiMs(muestra.instante) - inicio) / 1000) : indice + 1,
      ...(muestra.instante ? { instante: muestra.instante } : {}),
      velMs,
      tempC: numero(muestra.temperatura_c),
      potPct: numero(muestra.potencia_porcentaje),
      consignaObjetivoPct: numero(muestra.consigna_objetivo),
      flujoEstable: typeof muestra.flujo_estable === "boolean" ? muestra.flujo_estable : null,
      caudalM3s: muestra.caudal_m3s == null ? magnitudes.caudalM3s ?? null : Number(muestra.caudal_m3s),
      presionPa: muestra.presion_pa == null ? magnitudes.presionDinamicaPa ?? null : Number(muestra.presion_pa),
      frecHz: numero(muestra.frecuencia_hz),
      corrA: numero(muestra.corriente_a),
      rpm: numero(muestra.rpm),
      fuente: "api",
    };
  });
  const valores = (campo) => muestras.map((muestra) => muestra[campo]);
  const velocidades = valores("velMs");
  const resumenVelocidad = resumirSerie(
    velocidades, medicion.velocidad_media, medicion.velocidad_maxima, medicion.velocidad_minima
  );
  const extremos = velocidades.some(v => v != null) ? resumirValores(velocidades) : resumenVelocidad;
  const estabilidad = extremos.maxima != null && extremos.minima != null
    ? redondear(Math.max(0, extremos.maxima - extremos.minima))
    : null;
  const mediaTecnica = (campo, decimales = 1) => {
    const serie = valores(campo).filter((valor) => valor != null && Number.isFinite(Number(valor)));
    if (!serie.length) return null;
    const media = calcularMedia(serie);
    return decimales === 0 ? Math.round(media) : redondear(media, decimales);
  };

  return {
    id: docente ? medicion.id : `api-medicion-${medicion.id}`,
    nombre: medicion.nombre,
    estado: medicion.estado,
    fuente: medicion.fuente,
    calibracionVersion: medicion.calibracion_version ?? null,
    fechaInicio: medicion.fecha_inicio ?? null,
    fechaFin: medicion.fecha_fin ?? null,
    programa: medicion.programa ?? null,
    fecha: docente ? formatearFechaHora(medicion.creado_en) : formatearFecha(medicion.creado_en),
    ...(docente ? {} : { hora: formatearHora(medicion.creado_en) }),
    durSeg: medicion.duracion_segundos ?? muestras.length,
    totalMuestras: muestras.length,
    objVelMs: numero(medicion.velocidad_objetivo),
    objPotPct: numero(medicion.potencia_objetivo),
    velocidad: {
      ...resumenVelocidad,
      estabilidad,
    },
    temperatura: resumirSerie(valores("tempC"), medicion.temperatura_media),
    potencia: resumirSerie(valores("potPct"), medicion.potencia_media),
    tecnicos: {
      presionMediaPa: mediaTecnica("presionPa"),
      caudalMedioM3s: mediaTecnica("caudalM3s"),
      frecuenciaMedia: mediaTecnica("frecHz"),
      corrienteMedia: mediaTecnica("corrA"),
      rpmMedia: mediaTecnica("rpm", 0),
    },
    trazas: crearTrazas(muestras, medicion.programa?.etapas),
    eventos: eventosApi.map((evento) => ({
      id: evento.id,
      mensaje: evento.mensaje,
      instante: evento.creado_en,
      ...(docente ? {
        tipo: evento.tipo || "info",
        hora: formatearFechaHora(evento.creado_en),
      } : {
        hora: formatearHora(evento.creado_en),
        nivel: evento.tipo === "error" ? "critica" : "info",
        etiqueta: evento.tipo || "info",
      }),
    })),
    muestras,
  };
}

// Cada vista mantiene sus identificadores, formatos y campos actuales.
export function crearMedicionDesdeApi(medicion, muestrasApi = [], eventosApi = []) {
  return convertirMedicion(medicion, muestrasApi, eventosApi, false);
}

export function crearDetalleMedicionDocente(medicion, muestrasApi = [], eventosApi = []) {
  return convertirMedicion(medicion, muestrasApi, eventosApi, true);
}

export function crearEnsayoDesdeApi(ensayo, mediciones = []) {
  return {
    id: `api-ensayo-${ensayo.id}`,
    apiId: ensayo.id,
    codigo: ensayo.codigo,
    nombre: ensayo.nombre,
    objetivo: ensayo.objetivo || 'Sin objetivo definido',
    descripcion: ensayo.descripcion || '',
    fecha: formatearFecha(ensayo.creado_en),
    hora: formatearHora(ensayo.creado_en),
    estado: mediciones.length ? 'Con mediciones' : 'Preparado',
    mediciones: mediciones.map(medicion => crearMedicionDesdeApi(medicion)),
  };
}
