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
    muestrasMedicion: [],
    eventosMedicion: [],
    resumenUltMed: null,
    consignaVelocidadMs: 13.0,
    potPct: 10,
    tempC: 21.2,
    objTempC: 23.5,
    velMs: 0,
    objVelMs: 13.0,
    objPotPct: 70,
    frecHz: 0,
    corrA: 0,
    motorKw: 0,
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
}) {
  return {
    segundo,
    velMs,
    tempC,
    potPct,
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
      potencia: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.potPct,
      })),
    },
    eventos: eventos.slice(0, 6),
  };
}

export function crearRegistroMedicion({ resumen, estadoTunel }) {
  if (!resumen) {
    return null;
  }

  const muestras = resumen.trazas.velocidad.map((punto, indice) => ({
    segundo: punto.segundo,
    velMs: punto.valor,
    tempC: resumen.trazas.temperatura[indice]?.valor ?? 0,
    potPct: resumen.trazas.potencia[indice]?.valor ?? 0,
  }));

  return {
    id: crearIdentificador(),
    fecha: crearFechaCorta(),
    hora: resumen.horaFin,
    durSeg: resumen.durSeg,
    totalMuestras: resumen.totalMuestras,
    potConsPct: estadoTunel.potPct,
    objVelMs: estadoTunel.objVelMs,
    objPotPct: estadoTunel.objPotPct,
    velocidad: resumen.velocidad,
    temperatura: resumen.temperatura,
    potencia: resumen.potencia,
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



