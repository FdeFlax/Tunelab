const FORMATO_MEDICION_TUNELAB = "tunelab.medicion";
const VERSION_FORMATO_MEDICION = "1.0";

export const LIMITE_TAMANO_ARCHIVO_MEDICION_BYTES = 2 * 1024 * 1024;
export const LIMITE_ARCHIVOS_IMPORTACION = 20;
export const LIMITE_MUESTRAS_MEDICION = 20000;
export const LIMITE_EVENTOS_MEDICION = 500;

const FUENTES_TUNEL_VALIDAS = new Set(["simulado", "real"]);
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

function redondear(valor, decimales = 1) {
  return Number(valor.toFixed(decimales));
}

function calcularMedia(valores) {
  if (!valores.length) {
    return 0;
  }

  return valores.reduce((acumulado, valor) => acumulado + valor, 0) / valores.length;
}

function esObjeto(valor) {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function limitarTexto(texto, maximo) {
  return String(texto || "").trim().slice(0, maximo);
}

function validarTexto({ valor, campo, maximo, requerido = false }) {
  if (valor == null || valor === "") {
    if (requerido) {
      throw new Error(`El campo ${campo} es obligatorio.`);
    }

    return "";
  }

  if (typeof valor !== "string") {
    throw new Error(`El campo ${campo} debe ser texto.`);
  }

  if (valor.length > maximo) {
    throw new Error(`El campo ${campo} supera ${maximo} caracteres.`);
  }

  return valor.trim();
}

function validarNumero({ valor, campo, rango }) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new Error(`El campo ${campo} debe ser un numero valido.`);
  }

  if (valor < rango.min || valor > rango.max) {
    throw new Error(`El campo ${campo} esta fuera de rango.`);
  }

  return valor;
}

function obtenerValorTraza(traza, indice) {
  return traza?.[indice]?.valor ?? 0;
}

function calcularResumenDesdeMuestras({
  muestras,
  objVelMs,
  objPotPct,
}) {
  const velocidades = muestras.map((muestra) => muestra.velMs);
  const temperaturas = muestras.map((muestra) => muestra.tempC);
  const potencias = muestras.map((muestra) => muestra.potPct);
  const maxVelocidad = Math.max(...velocidades);
  const minVelocidad = Math.min(...velocidades);
  const muestrasEnObjetivo = velocidades.filter(
    (valor) => Math.abs(valor - objVelMs) <= 0.5
  ).length;

  return {
    velocidad: {
      media: redondear(calcularMedia(velocidades)),
      maxima: redondear(maxVelocidad),
      minima: redondear(minVelocidad),
      estabilidad: redondear(maxVelocidad - minVelocidad),
      objetivo: objVelMs,
      porcentajeEnRango: Math.round((muestrasEnObjetivo / muestras.length) * 100),
    },
    temperatura: {
      media: redondear(calcularMedia(temperaturas)),
      maxima: redondear(Math.max(...temperaturas)),
      minima: redondear(Math.min(...temperaturas)),
      objetivo: null,
    },
    potencia: {
      media: redondear(calcularMedia(potencias)),
      maxima: redondear(Math.max(...potencias)),
      minima: redondear(Math.min(...potencias)),
      objetivo: objPotPct,
    },
  };
}

function validarEnsayo(ensayo) {
  if (!esObjeto(ensayo)) {
    throw new Error("El archivo no incluye un ensayo valido.");
  }

  return {
    codigo: validarTexto({
      valor: ensayo.codigo,
      campo: "ensayo.codigo",
      maximo: LIMITES_TEXTO.codigo,
      requerido: true,
    }),
    nombre: validarTexto({
      valor: ensayo.nombre,
      campo: "ensayo.nombre",
      maximo: LIMITES_TEXTO.nombreEnsayo,
      requerido: true,
    }),
    objetivo: validarTexto({
      valor: ensayo.objetivo,
      campo: "ensayo.objetivo",
      maximo: LIMITES_TEXTO.objetivo,
    }),
    descripcion: validarTexto({
      valor: ensayo.descripcion,
      campo: "ensayo.descripcion",
      maximo: LIMITES_TEXTO.descripcion,
    }),
    fecha: validarTexto({
      valor: ensayo.fecha,
      campo: "ensayo.fecha",
      maximo: LIMITES_TEXTO.fecha,
    }),
    hora: validarTexto({
      valor: ensayo.hora,
      campo: "ensayo.hora",
      maximo: LIMITES_TEXTO.hora,
    }),
  };
}

function validarMuestra(muestra, indice) {
  if (!esObjeto(muestra)) {
    throw new Error(`La muestra ${indice + 1} no es valida.`);
  }

  return {
    segundo: validarNumero({
      valor: muestra.segundo,
      campo: `muestras[${indice}].segundo`,
      rango: RANGOS_NUMERICOS.segundo,
    }),
    velMs: validarNumero({
      valor: muestra.velMs,
      campo: `muestras[${indice}].velMs`,
      rango: RANGOS_NUMERICOS.velMs,
    }),
    tempC: validarNumero({
      valor: muestra.tempC,
      campo: `muestras[${indice}].tempC`,
      rango: RANGOS_NUMERICOS.tempC,
    }),
    potPct: validarNumero({
      valor: muestra.potPct,
      campo: `muestras[${indice}].potPct`,
      rango: RANGOS_NUMERICOS.potPct,
    }),
  };
}

function validarMuestras(muestras) {
  if (!Array.isArray(muestras) || muestras.length === 0) {
    throw new Error("El archivo no contiene muestras de medicion.");
  }

  if (muestras.length > LIMITE_MUESTRAS_MEDICION) {
    throw new Error(`El archivo supera el limite de ${LIMITE_MUESTRAS_MEDICION} muestras.`);
  }

  return muestras.map(validarMuestra);
}

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
      valor: evento.nivel || "info",
      campo: `eventos[${indice}].nivel`,
      maximo: LIMITES_TEXTO.eventoEtiqueta,
    });

    return {
      id: limitarTexto(evento.id || `evento-${indice + 1}`, LIMITES_TEXTO.nombreArchivo),
      hora: validarTexto({
        valor: evento.hora,
        campo: `eventos[${indice}].hora`,
        maximo: LIMITES_TEXTO.hora,
      }),
      nivel: NIVELES_EVENTO_VALIDOS.has(nivel) ? nivel : "info",
      etiqueta: validarTexto({
        valor: evento.etiqueta || "Info",
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
  const objVelMs = validarNumero({
    valor: Number(objetivos.velocidadMs ?? 0),
    campo: "medicion.objetivos.velocidadMs",
    rango: RANGOS_NUMERICOS.objVelMs,
  });
  const objPotPct = validarNumero({
    valor: Number(objetivos.potPct ?? 0),
    campo: "medicion.objetivos.potPct",
    rango: RANGOS_NUMERICOS.objPotPct,
  });
  const durSeg = validarNumero({
    valor: Number(medicion.durSeg ?? muestras.at(-1)?.segundo ?? 0),
    campo: "medicion.durSeg",
    rango: RANGOS_NUMERICOS.durSeg,
  });
  const potConsPct = validarNumero({
    valor: Number(medicion.potConsPct ?? 0),
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

  if (documento.version !== VERSION_FORMATO_MEDICION) {
    throw new Error(`Version de archivo no compatible: ${documento.version || "desconocida"}.`);
  }
}

function construirTrazasDesdeMuestras(muestras) {
  return {
    velocidad: muestras.map((muestra) => ({
      segundo: muestra.segundo,
      valor: muestra.velMs,
    })),
    temperatura: muestras.map((muestra) => ({
      segundo: muestra.segundo,
      valor: muestra.tempC,
    })),
    potencia: muestras.map((muestra) => ({
      segundo: muestra.segundo,
      valor: muestra.potPct,
    })),
  };
}

export function crearMuestrasDesdeMedicion(medicion) {
  const velocidades = medicion?.trazas?.velocidad || [];
  const temperaturas = medicion?.trazas?.temperatura || [];
  const potencias = medicion?.trazas?.potencia || [];

  return velocidades.map((punto, indice) => ({
    segundo: punto.segundo,
    velMs: punto.valor,
    tempC: obtenerValorTraza(temperaturas, indice),
    potPct: obtenerValorTraza(potencias, indice),
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
    fuenteTunel: fuenteTunel || "simulado",
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
      durSeg: medicion.durSeg || 0,
      totalMuestras: medicion.totalMuestras || muestras.length,
      potConsPct: medicion.potConsPct ?? estadoTunel?.potPct ?? 0,
      objetivos: {
        velocidadMs: medicion.objVelMs ?? estadoTunel?.objVelMs ?? 0,
        potPct: medicion.objPotPct ?? estadoTunel?.objPotPct ?? 0,
      },
      resumen: {
        velocidad: medicion.velocidad,
        temperatura: medicion.temperatura,
        potencia: medicion.potencia,
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
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = crearNombreArchivoMedicion(documento);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  return true;
}

function crearTablaCrc32() {
  const tabla = [];

  for (let i = 0; i < 256; i += 1) {
    let crc = i;

    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    tabla.push(crc >>> 0);
  }

  return tabla;
}

const TABLA_CRC32 = crearTablaCrc32();

function calcularCrc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = TABLA_CRC32[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function escribirTextoZip(texto) {
  return new TextEncoder().encode(texto);
}

function escribirUint16(valor) {
  return new Uint8Array([valor & 0xff, (valor >>> 8) & 0xff]);
}

function escribirUint32(valor) {
  return new Uint8Array([
    valor & 0xff,
    (valor >>> 8) & 0xff,
    (valor >>> 16) & 0xff,
    (valor >>> 24) & 0xff,
  ]);
}

function crearArchivoZip(nombre, contenido, posicion) {
  const nombreBytes = escribirTextoZip(nombre);
  const contenidoBytes = escribirTextoZip(contenido);
  const crc = calcularCrc32(contenidoBytes);
  const cabeceraLocal = new Uint8Array([
    ...escribirUint32(0x04034b50),
    ...escribirUint16(20),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint32(crc),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint16(nombreBytes.length),
    ...escribirUint16(0),
    ...nombreBytes,
  ]);
  const cabeceraCentral = new Uint8Array([
    ...escribirUint32(0x02014b50),
    ...escribirUint16(20),
    ...escribirUint16(20),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint32(crc),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint16(nombreBytes.length),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint32(0),
    ...escribirUint32(posicion),
    ...nombreBytes,
  ]);

  return {
    local: new Blob([cabeceraLocal, contenidoBytes]),
    central: cabeceraCentral,
    tamanoLocal: cabeceraLocal.length + contenidoBytes.length,
  };
}

export function descargarZipEnsayo({ ensayo, mediciones = [], fuenteTunel }) {
  if (!ensayo) {
    return false;
  }

  let posicion = 0;
  const locales = [];
  const centrales = [];

  const fichaEnsayo = crearArchivoZip(
    "ficha_ensayo.json",
    JSON.stringify({ ensayo, totalMediciones: mediciones.length }, null, 2),
    posicion
  );

  locales.push(fichaEnsayo.local);
  centrales.push(fichaEnsayo.central);
  posicion += fichaEnsayo.tamanoLocal;

  mediciones.forEach((medicion, indice) => {
    const documento = crearDocumentoMedicionTunelab({
      ensayo,
      medicion,
      fuenteTunel,
    });
    const nombreMedicion = crearNombreArchivoMedicion(documento).replace(/\.json$/i, "");
    const nombreArchivo = String(indice + 1).padStart(2, "0") + "_" + nombreMedicion + ".json";
    const archivo = crearArchivoZip(nombreArchivo, JSON.stringify(documento, null, 2), posicion);

    locales.push(archivo.local);
    centrales.push(archivo.central);
    posicion += archivo.tamanoLocal;
  });

  const tamanoCentral = centrales.reduce((total, central) => total + central.length, 0);
  const finCentral = new Uint8Array([
    ...escribirUint32(0x06054b50),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(centrales.length),
    ...escribirUint16(centrales.length),
    ...escribirUint32(tamanoCentral),
    ...escribirUint32(posicion),
    ...escribirUint16(0),
  ]);
  const blob = new Blob([...locales, ...centrales, finCentral], {
    type: "application/zip",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = normalizarNombreArchivo(ensayo.nombre || ensayo.codigo || "ensayo") + ".zip";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  return true;
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
  const resumenCalculado = calcularResumenDesdeMuestras({
    muestras,
    objVelMs: medicionBase.objVelMs,
    objPotPct: medicionBase.objPotPct,
  });
  const fuenteTunel = FUENTES_TUNEL_VALIDAS.has(documento.fuenteTunel)
    ? documento.fuenteTunel
    : "simulado";

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
      velocidad: resumenCalculado.velocidad,
      temperatura: resumenCalculado.temperatura,
      potencia: resumenCalculado.potencia,
      trazas: construirTrazasDesdeMuestras(muestras),
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
