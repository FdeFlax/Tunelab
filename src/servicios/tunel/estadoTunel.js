import { FICHA_TUNEL_ACTIVO } from "./fichaTunel.js";

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
export const DENSIDAD_AIRE_KG_M3 = FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3;

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
    potPct: 0,
    consignaPct: 0,
    consignaVariadorPct: 0,
    tempC: FICHA_TUNEL_ACTIVO.simulador.temperaturaInicialC,
    velMs: 0,
    presionPa: 0,
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
export function obtenerEnsayoActivo(estadoTunel) {
  return estadoTunel.ensayos.find((ensayo) => ensayo.id === estadoTunel.ensayoActivoId) || null;
}

export function motivoBloqueoMedicion(tunel, ensayo, puedeOperar) {
  if (!ensayo) return "Selecciona un ensayo antes de medir.";
  if (!puedeOperar || !tunel.permiteCtrl) return "Conecta el túnel para iniciar la medición.";
  if (tunel.bloqSeg) return "Revisa los avisos de seguridad antes de medir.";
  if (tunel.programa?.activo || tunel.medActiva) return "Ya hay una medición en curso.";
  if (!["READY", "RUNNING"].includes(tunel.estadoTunel)) return "El túnel no está disponible para iniciar la medición.";
  const limite = Number(tunel.limitesUso?.medicionesPorEnsayo || 15);
  if ((ensayo.mediciones?.length || 0) >= limite) return "Este ensayo ha alcanzado el límite de mediciones.";
  return "";
}

export function limitarValor(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
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
