import { z } from 'zod';
import { redondear } from "../formato.js";
import { crearTrazas, resumirValores } from "../mediciones/analisisMedicion.js";
import { crearZipSinCompresion } from "./zipSinCompresion.js";

const FORMATO_MEDICION_TUNELAB = "tunelab.medicion";
const VERSION_FORMATO_MEDICION = "1.2";

export const LIMITE_TAMANO_ARCHIVO_MEDICION_BYTES = 32 * 1024 * 1024;
export const LIMITE_ARCHIVOS_IMPORTACION = 20;
export const LIMITE_MUESTRAS_MEDICION = 100000;
export const LIMITE_MUESTRAS_IMPORTADAS = 250000;
export const LIMITE_EVENTOS_MEDICION = 500;

const FUENTES_TUNEL_VALIDAS = new Set(["simulado", "real", "desconocida"]);
const NIVELES_EVENTO_VALIDOS = new Set(["info", "advertencia", "critica"]);
const LIMITES_TEXTO = {
  codigo: 30,
  nombreEnsayo: 80,
  objetivo: 120,
  descripcion: 500,
  nombreMedicion: 80,
  fecha: 30,
  hora: 30,
  exportadoEn: 60,
  eventoEtiqueta: 40,
  eventoMensaje: 300,
  nombreArchivo: 180,
};
const RANGOS_NUMERICOS = {
  segundo: { min: 0, max: 24 * 60 * 60 },
  velMs: { min: 0, max: 60 },
  tempC: { min: -20, max: 80 },
  potPct: { min: 0, max: 100 },
  frecHz: { min: 0, max: 500 },
  corrA: { min: 0, max: 500 },
  rpm: { min: 0, max: 20000 },
  presionPa: { min: 0, max: 5000 },
  caudalM3s: { min: 0, max: 100 },
  durSeg: { min: 0, max: 24 * 60 * 60 },
  objVelMs: { min: 0, max: 60 },
  objPotPct: { min: 0, max: 100 },
  potConsPct: { min: 0, max: 100 },
};

function normalizarNombreArchivo(texto) {
  return String(texto || "medicion")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function esObjeto(valor) {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function limitarTexto(texto, maximo) {
  return String(texto || "").trim().slice(0, maximo);
}

const numeroEnRango = ({ min, max }) => z.number({ error: 'debe ser un número válido' })
  .min(min, 'está fuera de rango').max(max, 'está fuera de rango');
const textoLimitado = (maximo, requerido = false) => z.preprocess(v => v == null ? '' : v,
  z.string({ error: 'debe ser texto' }).max(maximo, `supera ${maximo} caracteres`).trim().min(requerido ? 1 : 0, 'es obligatorio'));
const instanteISO = z.preprocess(v => v === '' || v == null ? null : v,
  z.string({ error: 'debe ser una fecha en texto' }).max(40, 'supera 40 caracteres')
    .regex(/^\d{4}-\d{2}-\d{2}T/, 'no es una fecha ISO válida')
    .refine(v => Number.isFinite(Date.parse(v)), 'no es una fecha ISO válida').nullable());

function validar(esquema, valor, campo) {
  const resultado = esquema.safeParse(valor);
  if (resultado.success) return resultado.data;
  const error = resultado.error.issues[0];
  throw new Error(`El campo ${[campo, ...error.path].join('.')} ${error.message}.`);
}

function validarTexto({ valor, campo, maximo, requerido = false }) {
  return validar(textoLimitado(maximo, requerido), valor, campo);
}
function validarNumero({ valor, campo, rango }) {
  return validar(numeroEnRango(rango), valor, campo);
}
function validarNumeroOpcional({ valor, campo, rango }) {
  return valor == null ? null : validarNumero({ valor, campo, rango });
}

function obtenerValorTraza(traza, indice) {
  return traza?.[indice]?.valor ?? null;
}

function calcularResumenDesdeMuestras({ muestras }) {
  const serie = campo => resumirValores(muestras.map(m => m[campo]));
  const resumen = campo => {
    const { media, maxima, minima } = serie(campo);
    return Object.fromEntries(Object.entries({ media, maxima, minima }).map(([k, v]) => [k, v == null ? null : redondear(v)]));
  };
  const v = serie("velMs");
  const media = campo => { const valor = serie(campo).media; return valor == null ? null : redondear(valor); };
  return {
    velocidad: { ...resumen("velMs"), estabilidad: v.n ? redondear(v.maxima - v.minima) : null },
    temperatura: resumen("tempC"), potencia: resumen("potPct"),
    tecnicos: { frecuenciaMedia: media("frecHz"), corrienteMedia: media("corrA"), rpmMedia: media("rpm"),
      presionMediaPa: media("presionPa"), caudalMedioM3s: media("caudalM3s") },
  };
}

function validarInstante(valor, campo) {
  return validar(instanteISO, valor, campo);
}

function validarPrograma(programa) {
  if (programa == null) return null;
  if (!esObjeto(programa) || ![1, 2].includes(programa.version) || !Array.isArray(programa.etapas) || !programa.etapas.length || programa.etapas.length > 15) {
    throw new Error("El programa de la medición no es válido.");
  }
  let finAnterior = -1;
  const continua = programa.version === 2;
  const tiempo = (valor, campo) => validarNumeroOpcional({ valor, campo, rango: RANGOS_NUMERICOS.segundo });
  const etapas = programa.etapas.map((e, i) => {
    if (!esObjeto(e)) throw new Error("Etapa no válida.");
    const inicio = validarNumeroOpcional({valor:e.inicio_segundo,campo:`etapa ${i+1}: inicio`,rango:RANGOS_NUMERICOS.segundo});
    const fin = validarNumeroOpcional({valor:e.fin_segundo,campo:`etapa ${i+1}: fin`,rango:RANGOS_NUMERICOS.segundo});
    const cambio = continua ? tiempo(e.cambio_segundo, "cambio de consigna") : inicio;
    if ((fin != null && (cambio == null || fin < cambio)) || (cambio != null && cambio < finAnterior) ||
        (inicio != null && (cambio == null || inicio < cambio || (fin != null && inicio > fin)))) throw new Error("Intervalos de etapas incoherentes.");
    if (fin != null) finAnterior = fin;
    if (!["pendiente", "estabilizando", "registrando", "completada", "parcial"].includes(e.estado)) throw new Error("Estado de etapa no válido.");
    let tramos;
    if (continua) {
      if (!Array.isArray(e.tramos_estables) || e.tramos_estables.length > 4000) throw new Error("Tramos estables no válidos.");
      let anterior = cambio;
      tramos = e.tramos_estables.map((t, j) => {
        if (!esObjeto(t)) throw new Error("Tramo estable no válido.");
        const a = tiempo(t.inicio, "inicio estable"), b = tiempo(t.fin, "fin estable");
        if (a == null || anterior == null || a < anterior || (fin != null && (b == null || b > fin)) ||
            (b != null && b < a) || (b == null && j < e.tramos_estables.length - 1)) throw new Error("Intervalos estables incoherentes.");
        anterior = b;
        return { inicio: a, fin: b };
      });
    }
    return {consigna:validarNumero({valor:e.consigna,campo:"consigna",rango:{min:1,max:100}}),
      duracion_segundos:validarNumero({valor:e.duracion_segundos,campo:"registro",rango:{min:1,max:3600}}),
      inicio_segundo:inicio,fin_segundo:fin,estado:e.estado,
      ...(continua ? { cambio_segundo: cambio, tramos_estables: tramos } : {})};
  });
  const criterio = programa.criterio_estabilidad;
  return {version:programa.version,nombre:validarTexto({valor:programa.nombre,campo:"programa.nombre",maximo:40}),etapas,
    ...(continua && criterio ? { criterio_estabilidad: {
      tolerancia_ms: validarNumero({valor:criterio.tolerancia_ms,campo:"tolerancia",rango:{min:0,max:60}}),
      segundos: validarNumero({valor:criterio.segundos,campo:"espera estable",rango:RANGOS_NUMERICOS.segundo}),
    }} : {})};
}

function conservarResumen(original, calculado) {
  if (!esObjeto(original)) return calculado;
  return Object.fromEntries(Object.entries(calculado).map(([grupo, valores]) => [grupo,
    Object.fromEntries(Object.entries(valores).map(([campo, valor]) => {
      const guardado = original[grupo]?.[campo];
      return [campo, guardado === null || (typeof guardado === "number" && Number.isFinite(guardado)) ? guardado : valor];
    })),
  ]));
}

const esquemaEnsayo = z.object({
  codigo: textoLimitado(LIMITES_TEXTO.codigo, true),
  nombre: textoLimitado(LIMITES_TEXTO.nombreEnsayo, true),
  objetivo: textoLimitado(LIMITES_TEXTO.objetivo),
  descripcion: textoLimitado(LIMITES_TEXTO.descripcion),
  fecha: textoLimitado(LIMITES_TEXTO.fecha),
  hora: textoLimitado(LIMITES_TEXTO.hora),
});
const esquemaMuestra = z.object({
  segundo: numeroEnRango(RANGOS_NUMERICOS.segundo),
  ...Object.fromEntries(['velMs', 'tempC', 'potPct', 'frecHz', 'corrA', 'rpm', 'presionPa', 'caudalM3s']
    .map(campo => [campo, numeroEnRango(RANGOS_NUMERICOS[campo]).nullish().transform(v => v ?? null)])),
  flujoEstable: z.boolean({ error: 'debe ser verdadero o falso' }).nullish().transform(v => v ?? null),
  consignaObjetivoPct: numeroEnRango(RANGOS_NUMERICOS.potPct).nullish().transform(v => v ?? null),
  instante: instanteISO,
  fuente: z.preprocess(v => typeof v === 'string' ? limitarTexto(v, 30) : '', z.string()),
});
const esquemaMuestras = z.array(esquemaMuestra).min(1, 'no contiene muestras de medición')
  .max(LIMITE_MUESTRAS_MEDICION, `supera el límite de ${LIMITE_MUESTRAS_MEDICION} muestras`);

function validarEnsayo(ensayo) { return validar(esquemaEnsayo, ensayo, 'ensayo'); }
function validarMuestras(muestras) { return validar(esquemaMuestras, muestras, 'muestras'); }

function validarEventos(eventos) {
  if (eventos == null) {
    return [];
  }

  if (!Array.isArray(eventos)) {
    throw new Error("Los eventos de la medicion deben estar en una lista.");
  }

  if (eventos.length > LIMITE_EVENTOS_MEDICION) {
    throw new Error(`El archivo supera el limite de ${LIMITE_EVENTOS_MEDICION} eventos.`);
  }

  return eventos.map((evento, indice) => {
    if (!esObjeto(evento)) {
      throw new Error(`El evento ${indice + 1} no es valido.`);
    }

    const nivel = validarTexto({
      valor: evento.nivel || (evento.tipo === "error" ? "critica" : "info"),
      campo: `eventos[${indice}].nivel`,
      maximo: LIMITES_TEXTO.eventoEtiqueta,
    });

    return {
      id: limitarTexto(evento.id || `evento-${indice + 1}`, LIMITES_TEXTO.nombreArchivo),
      instante: validarInstante(evento.instante || evento.creado_en, "evento.instante"),
      tipo: validarTexto({valor:evento.tipo || evento.etiqueta,campo:"evento.tipo",maximo:40}),
      hora: validarTexto({
        valor: evento.hora,
        campo: `eventos[${indice}].hora`,
        maximo: LIMITES_TEXTO.hora,
      }),
      nivel: NIVELES_EVENTO_VALIDOS.has(nivel) ? nivel : "info",
      etiqueta: validarTexto({
        valor: evento.etiqueta || evento.tipo || "Info",
        campo: `eventos[${indice}].etiqueta`,
        maximo: LIMITES_TEXTO.eventoEtiqueta,
      }),
      mensaje: validarTexto({
        valor: evento.mensaje || "Evento sin descripcion",
        campo: `eventos[${indice}].mensaje`,
        maximo: LIMITES_TEXTO.eventoMensaje,
      }),
    };
  });
}

function validarMedicion(medicion, muestras) {
  if (!esObjeto(medicion)) {
    throw new Error("El archivo no incluye una medicion valida.");
  }

  const objetivos = esObjeto(medicion.objetivos) ? medicion.objetivos : {};
  const objVelMs = validarNumeroOpcional({
    valor: objetivos.velocidadMs,
    campo: "medicion.objetivos.velocidadMs",
    rango: RANGOS_NUMERICOS.objVelMs,
  });
  const objPotPct = validarNumeroOpcional({
    valor: objetivos.potPct,
    campo: "medicion.objetivos.potPct",
    rango: RANGOS_NUMERICOS.objPotPct,
  });
  const durSeg = validarNumero({
    valor: Number(medicion.durSeg ?? muestras.at(-1)?.segundo ?? 0),
    campo: "medicion.durSeg",
    rango: RANGOS_NUMERICOS.durSeg,
  });
  const potConsPct = validarNumeroOpcional({
    valor: medicion.potConsPct,
    campo: "medicion.potConsPct",
    rango: RANGOS_NUMERICOS.potConsPct,
  });

  return {
    id: limitarTexto(medicion.id || "medicion-importada", LIMITES_TEXTO.nombreArchivo),
    nombre: validarTexto({
      valor: medicion.nombre || "Medicion importada",
      campo: "medicion.nombre",
      maximo: LIMITES_TEXTO.nombreMedicion,
    }),
    fecha: validarTexto({
      valor: medicion.fecha,
      campo: "medicion.fecha",
      maximo: LIMITES_TEXTO.fecha,
    }),
    hora: validarTexto({
      valor: medicion.hora,
      campo: "medicion.hora",
      maximo: LIMITES_TEXTO.hora,
    }),
    durSeg,
    totalMuestras: muestras.length,
    estado: validarTexto({valor:medicion.estado,campo:"medicion.estado",maximo:30}) || null,
    fechaInicio: validarInstante(medicion.fechaInicio,"medicion.fechaInicio"),
    fechaFin: validarInstante(medicion.fechaFin,"medicion.fechaFin"),
    calibracionVersion: validarNumeroOpcional({valor:medicion.calibracionVersion,campo:"calibracionVersion",rango:{min:1,max:1000000}}),
    programa: validarPrograma(medicion.programa),
    potConsPct,
    objVelMs,
    objPotPct,
  };
}

function validarDocumentoMedicionTunelab(documento) {
  if (!esObjeto(documento)) {
    throw new Error("El archivo no contiene un objeto JSON valido.");
  }

  if (documento.formato !== FORMATO_MEDICION_TUNELAB) {
    throw new Error("El archivo no es una medicion Tunelab valida.");
  }

  if (!["1.0", "1.1", VERSION_FORMATO_MEDICION].includes(documento.version)) {
    throw new Error(`Version de archivo no compatible: ${documento.version || "desconocida"}.`);
  }
}

export function crearMuestrasDesdeMedicion(medicion) {
  const velocidades = medicion?.trazas?.velocidad || [];
  const temperaturas = medicion?.trazas?.temperatura || [];
  const potencias = medicion?.trazas?.potencia || [];
  const presiones = medicion?.trazas?.presion || [];

  return velocidades.map((punto, indice) => ({
    segundo: punto.segundo,
    velMs: punto.valor,
    tempC: obtenerValorTraza(temperaturas, indice),
    potPct: obtenerValorTraza(potencias, indice),
    presionPa: obtenerValorTraza(presiones, indice),
    caudalM3s: obtenerValorTraza(medicion?.trazas?.caudal, indice),
  }));
}

export function crearDocumentoMedicionTunelab({
  ensayo,
  medicion,
  fuenteTunel,
  estadoTunel,
}) {
  const muestras = medicion.muestras?.length
    ? medicion.muestras
    : crearMuestrasDesdeMedicion(medicion);

  return {
    formato: FORMATO_MEDICION_TUNELAB,
    version: VERSION_FORMATO_MEDICION,
    exportadoEn: new Date().toISOString(),
    fuenteTunel: FUENTES_TUNEL_VALIDAS.has(medicion.fuente) ? medicion.fuente
      : FUENTES_TUNEL_VALIDAS.has(fuenteTunel) ? fuenteTunel : "desconocida",
    ensayo: {
      codigo: ensayo?.codigo || "SIN-CODIGO",
      nombre: ensayo?.nombre || "Ensayo sin nombre",
      objetivo: ensayo?.objetivo || "",
      descripcion: ensayo?.descripcion || "",
      fecha: ensayo?.fecha || "",
      hora: ensayo?.hora || "",
    },
    medicion: {
      id: medicion.id,
      nombre: medicion.nombre || "Medicion sin nombre",
      fecha: medicion.fecha || "",
      hora: medicion.hora || "",
      estado: medicion.estado ?? null,
      fechaInicio: medicion.fechaInicio ?? null,
      fechaFin: medicion.fechaFin ?? null,
      calibracionVersion: medicion.calibracionVersion ?? null,
      programa: medicion.programa ?? null,
      durSeg: medicion.durSeg ?? 0,
      totalMuestras: medicion.totalMuestras || muestras.length,
      potConsPct: medicion.potConsPct ?? estadoTunel?.potPct ?? null,
      objetivos: {
        velocidadMs: medicion.objVelMs ?? estadoTunel?.objVelMs ?? null,
        potPct: medicion.objPotPct ?? estadoTunel?.objPotPct ?? null,
      },
      resumen: {
        velocidad: medicion.velocidad,
        temperatura: medicion.temperatura,
        potencia: medicion.potencia,
        tecnicos: medicion.tecnicos,
      },
    },
    muestras,
    eventos: medicion.eventos || [],
  };
}

export function crearNombreArchivoMedicion(documento) {
  const nombreEnsayo = normalizarNombreArchivo(documento?.ensayo?.nombre || "ensayo");
  const nombreMedicion = normalizarNombreArchivo(documento?.medicion?.nombre || "medicion");

  return `${nombreEnsayo}_${nombreMedicion}.json`;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  return true;
}

export function descargarArchivoMed({ ensayo, medicion, fuenteTunel, estadoTunel }) {
  if (!ensayo || !medicion) {
    return false;
  }

  const documento = crearDocumentoMedicionTunelab({
    ensayo,
    medicion,
    fuenteTunel,
    estadoTunel,
  });
  const blob = new Blob([JSON.stringify(documento, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  return descargarBlob(blob, crearNombreArchivoMedicion(documento));
}

export function descargarZipEnsayo({ ensayo, mediciones = [], fuenteTunel }) {
  if (!ensayo) {
    return false;
  }

  const archivos = [
    {
      nombre: "ficha_ensayo.json",
      contenido: JSON.stringify({ ensayo, totalMediciones: mediciones.length }, null, 2),
    },
    ...mediciones.map((medicion, indice) => {
    const documento = crearDocumentoMedicionTunelab({
      ensayo,
      medicion,
      fuenteTunel,
    });
    const nombreMedicion = crearNombreArchivoMedicion(documento).replace(/\.json$/i, "");
      return {
        nombre: String(indice + 1).padStart(2, "0") + "_" + nombreMedicion + ".json",
        contenido: JSON.stringify(documento, null, 2),
      };
    }),
  ];
  const blob = crearZipSinCompresion(archivos);
  return descargarBlob(blob, normalizarNombreArchivo(ensayo.nombre || ensayo.codigo || "ensayo") + ".zip");
}

export function normalizarDocumentoMedicionTunelab(documento, nombreArchivo = "") {
  validarDocumentoMedicionTunelab(documento);

  const ensayo = validarEnsayo(documento.ensayo);
  const muestras = validarMuestras(documento.muestras);
  const medicionBase = validarMedicion(documento.medicion, muestras);
  const eventos = validarEventos(documento.eventos);
  const exportadoEn = validarTexto({
    valor: documento.exportadoEn,
    campo: "exportadoEn",
    maximo: LIMITES_TEXTO.exportadoEn,
  });
  const resumenCalculado = conservarResumen(documento.medicion.resumen, calcularResumenDesdeMuestras({
    muestras,
  }));
  const fuenteTunel = FUENTES_TUNEL_VALIDAS.has(documento.fuenteTunel)
    ? documento.fuenteTunel
    : "desconocida";

  return {
    id: `${normalizarNombreArchivo(nombreArchivo || "archivo")}-${exportadoEn || Date.now()}`,
    nombreArchivo: limitarTexto(nombreArchivo, LIMITES_TEXTO.nombreArchivo),
    formato: documento.formato,
    version: documento.version,
    exportadoEn,
    fuenteTunel,
    ensayo,
    medicion: {
      ...medicionBase,
      fuente: fuenteTunel,
      velocidad: resumenCalculado.velocidad,
      temperatura: resumenCalculado.temperatura,
      potencia: resumenCalculado.potencia,
      tecnicos: resumenCalculado.tecnicos,
      trazas: crearTrazas(muestras, medicionBase.programa?.etapas),
      eventos,
      muestras,
    },
  };
}

export async function leerArchivoMedicionTunelab(archivo) {
  if (archivo.size > LIMITE_TAMANO_ARCHIVO_MEDICION_BYTES) {
    throw new Error("El archivo es demasiado grande para importarlo con seguridad.");
  }

  const texto = await archivo.text();
  let documento;

  try {
    documento = JSON.parse(texto);
  } catch {
    throw new Error("No se ha podido leer el JSON del archivo.");
  }

  return normalizarDocumentoMedicionTunelab(documento, archivo.name);
}

export function comprobarCapacidadImportacion(archivos, muestrasNuevas) {
  const total = archivos.reduce((n, archivo) => n + (archivo.medicion?.muestras?.length || 0), muestrasNuevas);
  if (total > LIMITE_MUESTRAS_IMPORTADAS) {
    throw new Error(`El visor admite hasta ${LIMITE_MUESTRAS_IMPORTADAS.toLocaleString("es-ES")} muestras importadas en total. Quita archivos antes de cargar más.`);
  }
}
