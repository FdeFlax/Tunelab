import {
  FICHA_TUNEL_ACTIVO,
  calcularMagnitudesDerivadas,
  calcularVelocidadPorConsigna,
  obtenerVelocidadMaximaCalibrada,
} from "./fichaTunel";

function crearHoraEvento(fecha = new Date()) {
  return fecha.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function crearFechaCorta(fecha = new Date()) {
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function crearIdentificador() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export const MAX_EVENTOS_ALERTA = 30;
export const MAX_EVENTOS_INFO = 30;
export const VELOCIDAD_MAXIMA_SIMULADA_MS = obtenerVelocidadMaximaCalibrada(FICHA_TUNEL_ACTIVO);
export const FRECUENCIA_NOMINAL_SIMULADA_HZ = FICHA_TUNEL_ACTIVO.variador.frecuenciaNominalHz;
export const RAMPA_VARIADOR_SIMULADA_S = 100 / FICHA_TUNEL_ACTIVO.variador.rampaSubidaPctS;
export const RPM_MAXIMAS_SIMULADAS = FICHA_TUNEL_ACTIVO.variador.rpmNominal;
export const CORRIENTE_MAXIMA_SIMULADA_A = FICHA_TUNEL_ACTIVO.estimaciones.corriente.corrienteMaximaA;
export const DENSIDAD_AIRE_KG_M3 = FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3;
export const TOLERANCIA_ESTABILIDAD_MS = FICHA_TUNEL_ACTIVO.modelo.toleranciaEstabilidadMs;
export const SEGUNDOS_ESTABILIDAD_REQUERIDOS = FICHA_TUNEL_ACTIVO.modelo.segundosEstabilidadRequeridos;

export function calcularPresionPitotPa(velocidadMs) {
  const velocidad = Math.max(0, Number(velocidadMs) || 0);
  return Number((0.5 * DENSIDAD_AIRE_KG_M3 * velocidad * velocidad).toFixed(1));
}

export function crearEvento({ nivel, mensaje, etiqueta }) {
  return {
    id: crearIdentificador(),
    hora: crearHoraEvento(),
    nivel,
    etiqueta,
    mensaje,
  };
}

export function crearEnsayo({ codigo, nombre, objetivo, descripcion = "" }) {
  return {
    id: crearIdentificador(),
    codigo,
    nombre,
    objetivo,
    descripcion,
    fecha: crearFechaCorta(),
    hora: crearHoraEvento(),
    estado: "Preparado",
    mediciones: [],
  };
}

export function generarNombreMedicion(mediciones = []) {
  return `Medicion ${String((mediciones?.length || 0) + 1).padStart(2, "0")}`;
}

export function generarCodigoEnsayo(ensayos = []) {
  const maximo = ensayos.reduce((mayor, ensayo) => {
    const coincidencia = String(ensayo.codigo || "").match(/A-(\d+)/);

    if (!coincidencia) {
      return mayor;
    }

    return Math.max(mayor, Number(coincidencia[1]));
  }, 0);

  return `A-${String(maximo + 1).padStart(3, "0")}`;
}

export function limitarAlarmasPorCategoria(alarmas) {
  let totalAlertas = 0;
  let totalInfo = 0;

  return alarmas.filter((alarma) => {
    const esAlerta = alarma.nivel === "advertencia" || alarma.nivel === "critica";

    if (esAlerta) {
      if (totalAlertas >= MAX_EVENTOS_ALERTA) {
        return false;
      }

      totalAlertas += 1;
      return true;
    }

    if (totalInfo >= MAX_EVENTOS_INFO) {
      return false;
    }

    totalInfo += 1;
    return true;
  });
}

export function crearEstadoTunelBase() {
  return {
    modoControl: "Control por software",
    etiquetaEnsayo: "Sin ficha preparada",
    ensayoActivoId: null,
    ensayos: [],
    prioridadPanel: "Normal",
    marcaAct: Date.now(),
    ultimaOrden: "Sistema listo para operar",
    horaUltimaOrden: crearHoraEvento(),
    estadoTunel: "READY",
    daq: "DAQ online",
    conVariador: "Variador online",
    estadoVar: "Disponible",
    permiteCtrl: true,
    bloqSeg: false,
    medActiva: false,
    medSeg: 0,
    estabilidadFlujoSeg: 0,
    flujoEstable: false,
    muestrasMedicion: [],
    eventosMedicion: [],
    resumenUltMed: null,
    consignaVelocidadMs: 0,
    potPct: 0,
    consignaPct: 0,
    consignaVariadorPct: 0,
    tempC: 21.2,
    objTempC: 23.5,
    velMs: 0,
    velRealMs: 0,
    velPitotMs: 0,
    velFiltradaMs: 0,
    presionPa: 0,
    presionSensorPa: 0,
    densidadKgM3: DENSIDAD_AIRE_KG_M3,
    caudalM3s: 0,
    caudalM3h: 0,
    caudalMasicoKgS: 0,
    reynolds: 0,
    objVelMs: 0,
    velocidadObjetivoMs: 0,
    objPotPct: 0,
    consignaObjetivoPct: 0,
    frecHz: 0,
    corrA: 0,
    cargaAerodinamicaRelativaPct: 0,
    rpm: 0,
    semillaRuido: FICHA_TUNEL_ACTIVO.sensor.transductorPresion.semillaAleatoria,
    tiempoSeg: 0,
    alarmas: [
      crearEvento({
        nivel: "info",
        etiqueta: "Info",
        mensaje: "Panel de simulacion cargado y listo para operar.",
      }),
    ],
  };
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

export function crearMuestraMedicion({
  segundo,
  velMs,
  tempC,
  potPct,
  frecHz = null,
  corrA = null,
  rpm = null,
  presionPa = null,
  caudalM3s = null,
  fuente = "simulado",
}) {
  const magnitudes = calcularMagnitudesDerivadas({ velocidadMs: velMs });

  return {
    segundo,
    velMs,
    tempC,
    potPct,
    frecHz,
    corrA,
    rpm,
    presionPa: presionPa ?? magnitudes.presionDinamicaPa,
    caudalM3s: caudalM3s ?? magnitudes.caudalM3s,
    fuente,
  };
}

export function calcularResumenMedicion({
  muestras = [],
  eventos = [],
  objVelMs = 0,
  objTempC = 0,
  objPotPct = 0,
}) {
  if (!muestras.length) {
    return null;
  }

  const velocidades = muestras.map((muestra) => muestra.velMs);
  const temperaturas = muestras.map((muestra) => muestra.tempC);
  const potencias = muestras.map((muestra) => muestra.potPct);
  const frecuencias = muestras
    .map((muestra) => muestra.frecHz)
    .filter((valor) => Number.isFinite(Number(valor)));
  const corrientes = muestras
    .map((muestra) => muestra.corrA)
    .filter((valor) => Number.isFinite(Number(valor)));
  const rpm = muestras
    .map((muestra) => muestra.rpm)
    .filter((valor) => Number.isFinite(Number(valor)));
  const presiones = muestras
    .map((muestra) => muestra.presionPa)
    .filter((valor) => Number.isFinite(Number(valor)));
  const magnitudesMuestras = muestras.map((muestra) =>
    calcularMagnitudesDerivadas({ velocidadMs: muestra.velMs })
  );
  const caudales = magnitudesMuestras
    .map((magnitud) => magnitud.caudalM3s)
    .filter((valor) => Number.isFinite(Number(valor)));
  const reynolds = magnitudesMuestras
    .map((magnitud) => magnitud.reynolds)
    .filter((valor) => Number.isFinite(Number(valor)));
  const maxVelocidad = Math.max(...velocidades);
  const minVelocidad = Math.min(...velocidades);
  const muestrasEnObjetivo = velocidades.filter(
    (valor) => Math.abs(valor - objVelMs) <= 0.5
  ).length;

  return {
    horaFin: crearHoraEvento(),
    durSeg: muestras[muestras.length - 1]?.segundo || 0,
    totalMuestras: muestras.length,
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
      objetivo: objTempC,
    },
    potencia: {
      media: redondear(calcularMedia(potencias)),
      maxima: redondear(Math.max(...potencias)),
      minima: redondear(Math.min(...potencias)),
      objetivo: objPotPct,
    },
    tecnicos: {
      frecuenciaMedia: frecuencias.length ? redondear(calcularMedia(frecuencias)) : null,
      corrienteMedia: corrientes.length ? redondear(calcularMedia(corrientes)) : null,
      rpmMedia: rpm.length ? Math.round(calcularMedia(rpm)) : null,
      presionMediaPa: presiones.length ? redondear(calcularMedia(presiones)) : null,
      caudalMedioM3s: caudales.length ? Number(calcularMedia(caudales).toFixed(3)) : null,
      reynoldsMedio: reynolds.length ? Math.round(calcularMedia(reynolds)) : null,
    },
    muestras,
    trazas: {
      velocidad: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.velMs,
      })),
      temperatura: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.tempC,
      })),
      caudal: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.caudalM3s ?? calcularMagnitudesDerivadas({ velocidadMs: muestra.velMs }).caudalM3s,
      })),
      potencia: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.potPct,
      })),
      presion: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.presionPa ?? calcularPresionPitotPa(muestra.velMs),
      })),
    },
    eventos: eventos.slice(0, 6),
  };
}

export function crearRegistroMedicion({ resumen, estadoTunel }) {
  if (!resumen) {
    return null;
  }

  const muestras = (resumen.muestras || resumen.trazas.velocidad.map((punto, indice) => ({
    segundo: punto.segundo,
    velMs: punto.valor,
    tempC: resumen.trazas.temperatura[indice]?.valor ?? 0,
    potPct: resumen.trazas.potencia[indice]?.valor ?? 0,
  }))).map((muestra) => ({
    ...muestra,
    presionPa: muestra.presionPa ?? calcularPresionPitotPa(muestra.velMs),
  }));

  return {
    id: crearIdentificador(),
    fecha: crearFechaCorta(),
    hora: resumen.horaFin,
    durSeg: resumen.durSeg,
    totalMuestras: resumen.totalMuestras,
    potConsPct: estadoTunel.consignaPct ?? estadoTunel.potPct,
    consignaPct: estadoTunel.consignaPct ?? estadoTunel.potPct,
    objVelMs: estadoTunel.velocidadObjetivoMs ?? estadoTunel.objVelMs,
    objPotPct: estadoTunel.consignaObjetivoPct ?? estadoTunel.objPotPct,
    consignaObjetivoPct: estadoTunel.consignaObjetivoPct ?? estadoTunel.objPotPct,
    velocidad: resumen.velocidad,
    temperatura: resumen.temperatura,
    potencia: resumen.potencia,
    tecnicos: resumen.tecnicos,
    trazas: resumen.trazas,
    eventos: resumen.eventos,
    muestras,
  };
}

export function convertirMedicionAResumen(medicion) {
  if (!medicion) {
    return null;
  }

  return {
    horaFin: medicion.hora,
    durSeg: medicion.durSeg,
    totalMuestras: medicion.totalMuestras,
    velocidad: medicion.velocidad,
    temperatura: medicion.temperatura,
    potencia: medicion.potencia,
    tecnicos: medicion.tecnicos,
    trazas: medicion.trazas,
    eventos: medicion.eventos || [],
    muestras: medicion.muestras || [],
  };
}

export function guardarMedicionEnEnsayo(ensayos, ensayoActivoId, medicion) {
  if (!medicion) {
    return ensayos;
  }

  return ensayos.map((ensayo) => {
    if (ensayo.id !== ensayoActivoId) {
      return ensayo;
    }

    return {
      ...ensayo,
      estado: "Con mediciones",
      mediciones: [
        {
          ...medicion,
          nombre: medicion.nombre || generarNombreMedicion(ensayo.mediciones),
        },
        ...(ensayo.mediciones || []),
      ],
    };
  });
}

export function renombrarMedicionEnEnsayos(ensayos, ensayoActivoId, medicionId, nombre) {
  return ensayos.map((ensayo) => {
    if (ensayo.id !== ensayoActivoId) {
      return ensayo;
    }

    return {
      ...ensayo,
      mediciones: (ensayo.mediciones || []).map((medicion) =>
        medicion.id === medicionId
          ? {
              ...medicion,
              nombre,
            }
          : medicion
      ),
    };
  });
}

export function eliminarMedicionDeEnsayos(ensayos, ensayoActivoId, medicionId) {
  return ensayos.map((ensayo) => {
    if (ensayo.id !== ensayoActivoId) {
      return ensayo;
    }

    const medicionesRestantes = (ensayo.mediciones || []).filter(
      (medicion) => medicion.id !== medicionId
    );

    return {
      ...ensayo,
      estado: medicionesRestantes.length ? "Con mediciones" : "Preparado",
      mediciones: medicionesRestantes,
    };
  });
}


export function actualizarEnsayoEnLista(ensayos, ensayoId, cambios) {
  return ensayos.map((ensayo) => {
    if (ensayo.id !== ensayoId) {
      return ensayo;
    }

    return {
      ...ensayo,
      nombre: cambios.nombre ?? ensayo.nombre,
      objetivo: cambios.objetivo ?? ensayo.objetivo,
      descripcion: cambios.descripcion ?? ensayo.descripcion,
    };
  });
}
export function eliminarEnsayoDeLista(ensayos, ensayoId) {
  return ensayos.filter((ensayo) => ensayo.id !== ensayoId);
}

export function obtenerEnsayoActivo(estadoTunel) {
  return estadoTunel.ensayos.find((ensayo) => ensayo.id === estadoTunel.ensayoActivoId) || null;
}

export function limitarValor(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

export function aproximarValor(actual, objetivo, pasoMaximo) {
  const diferencia = objetivo - actual;

  if (Math.abs(diferencia) <= pasoMaximo) {
    return objetivo;
  }

  return actual + Math.sign(diferencia) * pasoMaximo;
}

export function formatearTiempoFuncionamiento(segundosTotales) {
  const horas = Math.floor(segundosTotales / 3600)
    .toString()
    .padStart(2, "0");
  const minutos = Math.floor((segundosTotales % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const segundos = Math.floor(segundosTotales % 60)
    .toString()
    .padStart(2, "0");

  return `${horas}:${minutos}:${segundos}`;
}

export function formatearSegundosDesdeActualizacion(marcaAct) {
  const segundos = Math.max(0.1, (Date.now() - marcaAct) / 1000);
  return `${segundos.toFixed(1)} s`;
}

export function contarAlarmasActivas(alarmas) {
  return alarmas.filter(
    (alarma) => alarma.nivel === "advertencia" || alarma.nivel === "critica"
  ).length;
}

export function obtenerEstadoOperativoTunel(
  estadoTunel,
  {
    conectado = true,
    comprobacionPendiente = false,
    apagando = false,
    mantenimientoRequerido = false,
  } = {}
) {
  const alarmas = estadoTunel?.alarmas || [];
  const avisosActivos = contarAlarmasActivas(alarmas);
  const hayEmergencia = alarmas.some((alarma) => {
    const texto = `${alarma.etiqueta || ""} ${alarma.mensaje || ""}`.toLowerCase();
    return alarma.nivel === "critica" && (texto.includes("emergencia") || texto.includes("parada"));
  });

  if (!conectado || estadoTunel?.estadoTunel === "DESCONECTADO") {
    return {
      codigo: "SIN_CONEXION",
      etiqueta: "Sin conectar",
      detalle: "Conecta el tunel para poder operar",
      tono: "gris",
    };
  }

  if (mantenimientoRequerido || estadoTunel?.mantenimientoReq) {
    return {
      codigo: "MANTENIMIENTO",
      etiqueta: "Mantenimiento requerido",
      detalle: "Revisar el equipo antes de continuar",
      tono: "ambar",
    };
  }

  if (estadoTunel?.estadoTunel === "EMERGENCIA" || hayEmergencia) {
    return {
      codigo: "EMERGENCIA",
      etiqueta: "Emergencia",
      detalle: "Parada o bloqueo critico activo",
      tono: "rojo",
    };
  }

  if (estadoTunel?.bloqSeg) {
    return {
      codigo: "COMPROBACION_PENDIENTE",
      etiqueta: "Comprobacion pendiente",
      detalle: "Revisar seguridad antes de operar",
      tono: "ambar",
    };
  }

  if (avisosActivos > 0) {
    return {
      codigo: "ALARMA",
      etiqueta: "Error / alarma",
      detalle: resumirAlarmas(alarmas),
      tono: "ambar",
    };
  }

  if (comprobacionPendiente) {
    return {
      codigo: "COMPROBACION_PENDIENTE",
      etiqueta: "Comprobacion pendiente",
      detalle: "Completa la lista de seguridad para encender",
      tono: "ambar",
    };
  }

  if (estadoTunel?.medActiva) {
    return {
      codigo: "MIDIENDO",
      etiqueta: "Midiendo",
      detalle: "Captura de datos en curso",
      tono: "verde",
    };
  }

  if (apagando || estadoTunel?.estadoTunel === "PARANDO" || estadoTunel?.estadoTunel === "STOPPING") {
    return {
      codigo: "PARANDO",
      etiqueta: "Parando",
      detalle: "Deteniendo la turbomaquina de forma controlada",
      tono: "ambar",
    };
  }

  if (estadoTunel?.estadoTunel === "RUNNING") {
    return {
      codigo: "EN_MARCHA",
      etiqueta: "En marcha",
      detalle: "Tunel encendido y flujo activo",
      tono: "verde",
    };
  }

  if (estadoTunel?.estadoTunel === "READY") {
    return {
      codigo: "PREPARADO",
      etiqueta: "Preparado / Ready",
      detalle: "Listo para iniciar el procedimiento",
      tono: "verde",
    };
  }

  return {
    codigo: "CONECTADO",
    etiqueta: "Conectado",
    detalle: "Sistema conectado, pendiente de preparacion",
    tono: "azul",
  };
}
export function resumirAlarmas(alarmas) {
  const advertencias = alarmas.filter((alarma) => alarma.nivel === "advertencia").length;
  const criticas = alarmas.filter((alarma) => alarma.nivel === "critica").length;

  if (!advertencias && !criticas) {
    return "Sin avisos";
  }

  const partes = [];

  if (advertencias) {
    partes.push(
      `${advertencias} advertencia${advertencias === 1 ? "" : "s"}`
    );
  }

  if (criticas) {
    partes.push(`${criticas} critica${criticas === 1 ? "" : "s"}`);
  }

  return partes.join(", ");
}



