export const FICHA_TUNEL_ACTIVO = {
  id: "ua-tunel-real-medido",
  version: 2,
  nombre: "Tunel de viento UA",
  fuente: "Modelo calibrado con medidas reales y geometria documentada",
  advertencia:
    "La consigna porcentual representa la orden enviada al variador. No debe interpretarse como potencia electrica real medida.",
  geometria: {
    seccionEnsayo: {
      anchoM: 0.7,
      altoM: 0.7,
      longitudM: 1,
      fuente: "Planos y medidas del tunel. Coherente con la contraccion 4:1.",
      calidadDato: "media_alta",
    },
    camaraEstabilizacion: {
      anchoM: 1.4,
      altoM: 1.4,
      longitudM: 0.07,
      honeycomb: true,
      fuente: "Documentacion tecnica del tunel.",
      calidadDato: "media",
    },
    contraccion: {
      longitudM: 1.68,
      entrada: {
        anchoM: 1.4,
        altoM: 1.4,
      },
      salida: {
        anchoM: 0.7,
        altoM: 0.7,
      },
      perfilGeometrico: "smoothstep",
      fuente: "Planos y documentacion tecnica del tunel.",
      calidadDato: "alta",
    },
    adaptadorSeccionHistorico: {
      activo: false,
      entrada: {
        anchoM: 0.8,
        altoM: 0.8,
      },
      salida: {
        diametroM: 1.25,
      },
      longitudM: 0.85,
      usarEnCalculosBasicos: false,
      fuente: "Documentacion tecnica antigua del adaptador de seccion.",
      calidadDato: "historico",
    },
    difusor: {
      activo: true,
      envolvente: {
        longitudM: 1.15,
        anchoM: 0.78,
        altoM: 0.78,
      },
      entrada: {
        forma: "rectangular",
        anchoM: 0.7,
        altoM: 0.7,
      },
      salida: {
        forma: "desconocida",
        anchoM: null,
        altoM: null,
        diametroM: null,
      },
      usarSalidaEnCalculos: false,
      calidadDato: "media",
      fuente: "Modelo CAD utilizado para construir el gemelo digital.",
    },
  },
  variador: {
    consignaMinPct: 0,
    consignaMaxPct: 100,
    frecuenciaNominalHz: 50,
    rpmNominal: 3000,
    rampaS: 5,
    rampaSubidaPctS: 20,
    rampaBajadaPctS: 20,
  },
  calibracionVelocidad: {
    variableEntrada: "consigna_porcentual_variador",
    metodo: "interpolacion_lineal_por_tramos",
    extrapolacion: "limitar_a_extremos",
    puntos: [
      {
        consignaPct: 0,
        velocidadMs: 0,
        medido: false,
        origenDato: "Condicion fisica asumida con el tunel apagado.",
      },
      {
        consignaPct: 50,
        velocidadMs: 5.121,
        medido: true,
        origenDato: "Medicion obtenida con la aplicacion MATLAB del tunel real.",
      },
      {
        consignaPct: 75,
        velocidadMs: 8.18,
        medido: true,
        origenDato: "Medicion obtenida con la aplicacion MATLAB del tunel real.",
      },
      {
        consignaPct: 100,
        velocidadMs: 11.119,
        medido: true,
        origenDato: "Medicion obtenida con la aplicacion MATLAB del tunel real.",
      },
    ],
  },
  limites: {
    presionDinamicaMaximaPa: 150,
    caudalMaximoM3s: 10,
  },
  ambiente: {
    temperaturaC: 20,
    presionAtmosfericaPa: 101325,
    constanteGasAireJKgK: 287.05,
    viscosidadDinamicaPaS: 1.81e-5,
    usarDensidadConstante: false,
    densidadReferenciaKgM3: 1.204,
  },
  estimaciones: {
    mostrarCorriente: false,
    mostrarRpm: false,
    mostrarTemperaturaMotor: false,
    corriente: {
      modelo: "lineal_sintetico",
      corrienteMaximaA: 12,
      calidadDato: "no_medido",
    },
    rpm: {
      modelo: "proporcional_a_consigna",
      calidadDato: "estimado",
    },
    frecuencia: {
      modelo: "proporcional_a_consigna",
      calidadDato: "estimado",
    },
  },
  dinamica: {
    intervaloActualizacionS: 0.02,
    tiempoMaximoPasoS: 0.25,
    constanteTiempoFlujoS: 0.8,
    constanteTiempoSensorS: 0.4,
  },
  sensor: {
    pitot: {
      coeficiente: 1,
    },
    transductorPresion: {
      biasPa: 0,
      ruidoActivado: true,
      desviacionRuidoPa: 0.25,
      semillaAleatoria: 12345,
    },
    visualizacion: {
      decimalesVelocidad: 3,
      decimalesPresion: 2,
      decimalesCaudal: 3,
    },
  },
  modelo: {
    toleranciaEstabilidadMs: 0.03,
    segundosEstabilidadRequeridos: 4,
    toleranciaVelocidadDetenidoMs: 0.02,
    toleranciaConsignaDetenidoPct: 0.1,
  },
};

function esNumeroFinito(valor) {
  return Number.isFinite(Number(valor));
}

export function limitar(valor, minimo, maximo) {
  const numero = Number(valor);
  const min = Number(minimo);
  const max = Number(maximo);

  if (!Number.isFinite(numero)) {
    return min;
  }

  return Math.min(max, Math.max(min, numero));
}

function redondear(valor, decimales = 3) {
  return Number(Number(valor || 0).toFixed(decimales));
}

export function calcularAreaRectangular(anchoM, altoM) {
  const ancho = Number(anchoM) || 0;
  const alto = Number(altoM) || 0;
  return ancho > 0 && alto > 0 ? ancho * alto : 0;
}

export function calcularAreaCircular(diametroM) {
  const diametro = Number(diametroM) || 0;
  return diametro > 0 ? (Math.PI * diametro ** 2) / 4 : 0;
}

export function calcularPerimetroRectangular(anchoM, altoM) {
  const ancho = Number(anchoM) || 0;
  const alto = Number(altoM) || 0;
  return ancho > 0 && alto > 0 ? 2 * (ancho + alto) : 0;
}

export function calcularDiametroHidraulicoRectangular(anchoM, altoM) {
  const area = calcularAreaRectangular(anchoM, altoM);
  const perimetro = calcularPerimetroRectangular(anchoM, altoM);
  return perimetro > 0 ? (4 * area) / perimetro : 0;
}

export function obtenerAreaSeccionEnsayo(ficha = FICHA_TUNEL_ACTIVO) {
  const seccion = ficha.geometria.seccionEnsayo;
  return calcularAreaRectangular(seccion.anchoM, seccion.altoM);
}

export function obtenerAreaCamaraEstabilizacion(ficha = FICHA_TUNEL_ACTIVO) {
  const camara = ficha.geometria.camaraEstabilizacion;
  return calcularAreaRectangular(camara.anchoM, camara.altoM);
}

export function calcularRelacionContraccion(ficha = FICHA_TUNEL_ACTIVO) {
  const entrada = ficha.geometria.contraccion.entrada;
  const salida = ficha.geometria.contraccion.salida;
  const areaEntrada = calcularAreaRectangular(entrada.anchoM, entrada.altoM);
  const areaSalida = calcularAreaRectangular(salida.anchoM, salida.altoM);

  return areaSalida > 0 ? redondear(areaEntrada / areaSalida, 2) : 0;
}

export function obtenerVelocidadMaximaCalibrada(ficha = FICHA_TUNEL_ACTIVO) {
  return Math.max(
    0,
    ...ficha.calibracionVelocidad.puntos.map((punto) => Number(punto.velocidadMs) || 0)
  );
}

export function calcularDuracionRampaSubidaS(ficha = FICHA_TUNEL_ACTIVO) {
  const rampa = Number(ficha.variador.rampaSubidaPctS) || 0;
  return rampa > 0 ? 100 / rampa : 0;
}

export function calcularDuracionRampaBajadaS(ficha = FICHA_TUNEL_ACTIVO) {
  const rampa = Number(ficha.variador.rampaBajadaPctS) || 0;
  return rampa > 0 ? 100 / rampa : 0;
}

export function calcularFactorVariador(consignaPct, ficha = FICHA_TUNEL_ACTIVO) {
  return (
    limitar(
      consignaPct,
      ficha.variador.consignaMinPct,
      ficha.variador.consignaMaxPct
    ) / ficha.variador.consignaMaxPct
  );
}

export function calcularFrecuenciaPorConsigna(consignaPct, ficha = FICHA_TUNEL_ACTIVO) {
  return redondear(calcularFactorVariador(consignaPct, ficha) * ficha.variador.frecuenciaNominalHz, 1);
}

export function calcularRpmPorConsigna(consignaPct, ficha = FICHA_TUNEL_ACTIVO) {
  return Math.round(calcularFactorVariador(consignaPct, ficha) * ficha.variador.rpmNominal);
}

export function interpolarLineal(puntos, entrada, opciones = {}) {
  const {
    claveX = "consignaPct",
    claveY = "velocidadMs",
    minimo = null,
    maximo = null,
  } = opciones;

  if (!Array.isArray(puntos) || puntos.length < 2) {
    throw new Error("La interpolacion necesita al menos dos puntos.");
  }

  const puntosOrdenados = [...puntos]
    .map((punto) => ({
      ...punto,
      [claveX]: Number(punto[claveX]),
      [claveY]: Number(punto[claveY]),
    }))
    .sort((a, b) => a[claveX] - b[claveX]);

  puntosOrdenados.forEach((punto, indice) => {
    if (!esNumeroFinito(punto[claveX]) || !esNumeroFinito(punto[claveY])) {
      throw new Error("La calibracion contiene puntos no numericos.");
    }

    if (indice > 0 && punto[claveX] === puntosOrdenados[indice - 1][claveX]) {
      throw new Error(`La calibracion contiene una consigna duplicada: ${punto[claveX]}.`);
    }
  });

  const xMin = minimo ?? puntosOrdenados[0][claveX];
  const xMax = maximo ?? puntosOrdenados[puntosOrdenados.length - 1][claveX];
  const x = limitar(entrada, xMin, xMax);

  if (x <= puntosOrdenados[0][claveX]) {
    return Math.max(0, puntosOrdenados[0][claveY]);
  }

  const ultimo = puntosOrdenados[puntosOrdenados.length - 1];

  if (x >= ultimo[claveX]) {
    return Math.max(0, ultimo[claveY]);
  }

  for (let i = 0; i < puntosOrdenados.length - 1; i += 1) {
    const p1 = puntosOrdenados[i];
    const p2 = puntosOrdenados[i + 1];

    if (x >= p1[claveX] && x <= p2[claveX]) {
      if (x === p1[claveX]) {
        return Math.max(0, p1[claveY]);
      }

      if (x === p2[claveX]) {
        return Math.max(0, p2[claveY]);
      }

      const factor = (x - p1[claveX]) / (p2[claveX] - p1[claveX]);
      return Math.max(0, p1[claveY] + factor * (p2[claveY] - p1[claveY]));
    }
  }

  return 0;
}

export function calcularVelocidadPorConsigna(consignaPct, ficha = FICHA_TUNEL_ACTIVO) {
  return redondear(
    interpolarLineal(ficha.calibracionVelocidad.puntos, consignaPct, {
      minimo: ficha.variador.consignaMinPct,
      maximo: ficha.variador.consignaMaxPct,
    }),
    ficha.sensor.visualizacion.decimalesVelocidad
  );
}

export function calcularConsignaPorVelocidad(velocidadMs, ficha = FICHA_TUNEL_ACTIVO) {
  return redondear(
    interpolarLineal(ficha.calibracionVelocidad.puntos, velocidadMs, {
      claveX: "velocidadMs",
      claveY: "consignaPct",
      minimo: 0,
      maximo: obtenerVelocidadMaximaCalibrada(ficha),
    }),
    1
  );
}

export const calcularVelocidadPorPotencia = calcularVelocidadPorConsigna;
export const calcularPotenciaPorVelocidad = calcularConsignaPorVelocidad;

export function calcularDensidadAire({
  temperaturaC = FICHA_TUNEL_ACTIVO.ambiente.temperaturaC,
  presionAtmosfericaPa = FICHA_TUNEL_ACTIVO.ambiente.presionAtmosfericaPa,
  constanteGasAireJKgK = FICHA_TUNEL_ACTIVO.ambiente.constanteGasAireJKgK,
  usarDensidadConstante = FICHA_TUNEL_ACTIVO.ambiente.usarDensidadConstante,
  densidadReferenciaKgM3 = FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3,
} = {}) {
  if (usarDensidadConstante) {
    return Number(densidadReferenciaKgM3) || FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3;
  }

  const temperaturaK = Number(temperaturaC) + 273.15;

  if (temperaturaK <= 0 || !Number.isFinite(temperaturaK)) {
    return FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3;
  }

  return Number(presionAtmosfericaPa) / (Number(constanteGasAireJKgK) * temperaturaK);
}

export function calcularPresionDinamica(velocidadMs, densidadKgM3 = FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3) {
  const velocidad = Math.max(0, Number(velocidadMs) || 0);
  return 0.5 * densidadKgM3 * velocidad ** 2;
}

export function calcularPresionDinamicaPitotPa(velocidadMs, ficha = FICHA_TUNEL_ACTIVO) {
  const densidad = calcularDensidadAire({
    ...ficha.ambiente,
  });
  return redondear(calcularPresionDinamica(velocidadMs, densidad), 1);
}

export function calcularVelocidadPitot(presionDiferencialPa, densidadKgM3, coeficientePitot = 1) {
  const presion = Math.max(0, Number(presionDiferencialPa) || 0);
  const densidad = Math.max(0.0001, Number(densidadKgM3) || FICHA_TUNEL_ACTIVO.ambiente.densidadReferenciaKgM3);
  return Math.max(0, Number(coeficientePitot) || 1) * Math.sqrt((2 * presion) / densidad);
}

export function calcularCaudalVolumetrico(areaM2, velocidadMs) {
  return Math.max(0, Number(areaM2) || 0) * Math.max(0, Number(velocidadMs) || 0);
}

export function convertirCaudalM3sAM3h(caudalM3s) {
  return Math.max(0, Number(caudalM3s) || 0) * 3600;
}

export function calcularCaudalMasico(densidadKgM3, caudalM3s) {
  return Math.max(0, Number(densidadKgM3) || 0) * Math.max(0, Number(caudalM3s) || 0);
}

export function calcularVelocidadPorContinuidad(caudalM3s, areaM2) {
  const area = Number(areaM2) || 0;
  return area > 0 ? Math.max(0, Number(caudalM3s) || 0) / area : 0;
}

export function calcularReynolds(densidadKgM3, velocidadMs, longitudCaracteristicaM, viscosidadDinamicaPaS) {
  const viscosidad = Number(viscosidadDinamicaPaS) || 0;

  if (viscosidad <= 0) {
    return 0;
  }

  return (
    Math.max(0, Number(densidadKgM3) || 0) *
    Math.max(0, Number(velocidadMs) || 0) *
    Math.max(0, Number(longitudCaracteristicaM) || 0)
  ) / viscosidad;
}

export function calcularSeccionContraccion(posicionM, geometriaContraccion = FICHA_TUNEL_ACTIVO.geometria.contraccion) {
  const longitud = Math.max(0.0001, Number(geometriaContraccion.longitudM) || 0);
  const posicion = limitar(posicionM, 0, longitud);
  const posicionNormalizada = posicion / longitud;
  const smoothstep = 3 * posicionNormalizada ** 2 - 2 * posicionNormalizada ** 3;
  const anchoM =
    geometriaContraccion.entrada.anchoM +
    (geometriaContraccion.salida.anchoM - geometriaContraccion.entrada.anchoM) * smoothstep;
  const altoM =
    geometriaContraccion.entrada.altoM +
    (geometriaContraccion.salida.altoM - geometriaContraccion.entrada.altoM) * smoothstep;

  return {
    posicionM: redondear(posicion, 4),
    posicionNormalizada: redondear(posicionNormalizada, 4),
    anchoM: redondear(anchoM, 4),
    altoM: redondear(altoM, 4),
    areaM2: redondear(calcularAreaRectangular(anchoM, altoM), 4),
  };
}

export function calcularCaudalMaximoM3s(ficha = FICHA_TUNEL_ACTIVO) {
  return calcularCaudalVolumetrico(obtenerAreaSeccionEnsayo(ficha), obtenerVelocidadMaximaCalibrada(ficha));
}

export function calcularCaudalPorConsigna(consignaPct, ficha = FICHA_TUNEL_ACTIVO) {
  return redondear(
    calcularCaudalVolumetrico(obtenerAreaSeccionEnsayo(ficha), calcularVelocidadPorConsigna(consignaPct, ficha)),
    ficha.sensor.visualizacion.decimalesCaudal
  );
}

export function calcularCargaAerodinamicaRelativaPct(velocidadMs, ficha = FICHA_TUNEL_ACTIVO) {
  const velocidadMaxima = obtenerVelocidadMaximaCalibrada(ficha);
  const velocidad = limitar(velocidadMs, 0, velocidadMaxima);
  const cargaRelativa = velocidadMaxima > 0 ? (velocidad / velocidadMaxima) ** 3 : 0;

  return redondear(cargaRelativa * 100, 1);
}

export function crearGeneradorAleatorio(semillaInicial = 12345) {
  let semilla = Number(semillaInicial) || 12345;

  return {
    siguiente() {
      semilla = (semilla * 1664525 + 1013904223) >>> 0;
      return semilla / 4294967296;
    },
    obtenerSemilla() {
      return semilla;
    },
  };
}

export function generarRuidoNormal(generador, desviacion = 1) {
  const u1 = Math.max(generador.siguiente(), Number.EPSILON);
  const u2 = Math.max(generador.siguiente(), Number.EPSILON);
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return normal * desviacion;
}

export function calcularMagnitudesDerivadas({
  velocidadMs,
  temperaturaC = FICHA_TUNEL_ACTIVO.ambiente.temperaturaC,
  presionAtmosfericaPa = FICHA_TUNEL_ACTIVO.ambiente.presionAtmosfericaPa,
  ficha = FICHA_TUNEL_ACTIVO,
} = {}) {
  const areaEnsayo = obtenerAreaSeccionEnsayo(ficha);
  const areaCamara = obtenerAreaCamaraEstabilizacion(ficha);
  const entradaDifusor = ficha.geometria.difusor?.entrada || ficha.geometria.adaptadorSeccionHistorico?.entrada;
  const areaDifusorEntrada = calcularAreaRectangular(
    entradaDifusor?.anchoM,
    entradaDifusor?.altoM
  );
  const densidad = calcularDensidadAire({
    ...ficha.ambiente,
    temperaturaC,
    presionAtmosfericaPa,
  });
  const velocidad = Math.max(0, Number(velocidadMs) || 0);
  const caudalM3s = calcularCaudalVolumetrico(areaEnsayo, velocidad);
  const diametroHidraulico = calcularDiametroHidraulicoRectangular(
    ficha.geometria.seccionEnsayo.anchoM,
    ficha.geometria.seccionEnsayo.altoM
  );

  return {
    densidadKgM3: redondear(densidad, 4),
    areaEnsayoM2: redondear(areaEnsayo, 4),
    areaCamaraM2: redondear(areaCamara, 4),
    relacionContraccion: calcularRelacionContraccion(ficha),
    diametroHidraulicoEnsayoM: redondear(diametroHidraulico, 4),
    caudalM3s: redondear(caudalM3s, ficha.sensor.visualizacion.decimalesCaudal),
    caudalM3h: redondear(convertirCaudalM3sAM3h(caudalM3s), 1),
    caudalMasicoKgS: redondear(calcularCaudalMasico(densidad, caudalM3s), 3),
    presionDinamicaPa: redondear(calcularPresionDinamica(velocidad, densidad), 2),
    reynolds: Math.round(
      calcularReynolds(
        densidad,
        velocidad,
        diametroHidraulico,
        ficha.ambiente.viscosidadDinamicaPaS
      )
    ),
    velocidadesPorSeccion: {
      camaraEstabilizacionMs: redondear(calcularVelocidadPorContinuidad(caudalM3s, areaCamara), 3),
      entradaContraccionMs: redondear(calcularVelocidadPorContinuidad(caudalM3s, areaCamara), 3),
      salidaContraccionMs: redondear(calcularVelocidadPorContinuidad(caudalM3s, areaEnsayo), 3),
      seccionEnsayoMs: redondear(velocidad, 3),
      difusorEntradaMs: redondear(calcularVelocidadPorContinuidad(caudalM3s, areaDifusorEntrada), 3),
    },
  };
}

function validarNumeroMayorQueCero(valor, ruta, errores) {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    errores.push(`${ruta} debe ser un numero mayor que cero.`);
  }
}

function validarNumeroNoNegativo(valor, ruta, errores) {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
    errores.push(`${ruta} debe ser un numero mayor o igual que cero.`);
  }
}

export function validarFichaTunel(ficha = FICHA_TUNEL_ACTIVO) {
  const errores = [];

  validarNumeroMayorQueCero(ficha.geometria.seccionEnsayo.anchoM, "geometria.seccionEnsayo.anchoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.seccionEnsayo.altoM, "geometria.seccionEnsayo.altoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.camaraEstabilizacion.anchoM, "geometria.camaraEstabilizacion.anchoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.camaraEstabilizacion.altoM, "geometria.camaraEstabilizacion.altoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.contraccion.longitudM, "geometria.contraccion.longitudM", errores);
  validarNumeroMayorQueCero(ficha.geometria.contraccion.entrada.anchoM, "geometria.contraccion.entrada.anchoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.contraccion.entrada.altoM, "geometria.contraccion.entrada.altoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.contraccion.salida.anchoM, "geometria.contraccion.salida.anchoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.contraccion.salida.altoM, "geometria.contraccion.salida.altoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.difusor.envolvente.longitudM, "geometria.difusor.envolvente.longitudM", errores);
  validarNumeroMayorQueCero(ficha.geometria.difusor.entrada.anchoM, "geometria.difusor.entrada.anchoM", errores);
  validarNumeroMayorQueCero(ficha.geometria.difusor.entrada.altoM, "geometria.difusor.entrada.altoM", errores);
  validarNumeroMayorQueCero(ficha.variador.consignaMaxPct, "variador.consignaMaxPct", errores);
  validarNumeroMayorQueCero(ficha.variador.frecuenciaNominalHz, "variador.frecuenciaNominalHz", errores);
  validarNumeroMayorQueCero(ficha.variador.rpmNominal, "variador.rpmNominal", errores);
  validarNumeroMayorQueCero(ficha.variador.rampaSubidaPctS, "variador.rampaSubidaPctS", errores);
  validarNumeroMayorQueCero(ficha.variador.rampaBajadaPctS, "variador.rampaBajadaPctS", errores);
  validarNumeroMayorQueCero(ficha.ambiente.presionAtmosfericaPa, "ambiente.presionAtmosfericaPa", errores);
  validarNumeroMayorQueCero(ficha.ambiente.constanteGasAireJKgK, "ambiente.constanteGasAireJKgK", errores);
  validarNumeroMayorQueCero(ficha.ambiente.viscosidadDinamicaPaS, "ambiente.viscosidadDinamicaPaS", errores);
  validarNumeroMayorQueCero(ficha.ambiente.densidadReferenciaKgM3, "ambiente.densidadReferenciaKgM3", errores);
  validarNumeroNoNegativo(ficha.sensor.transductorPresion.desviacionRuidoPa, "sensor.transductorPresion.desviacionRuidoPa", errores);

  const puntos = ficha.calibracionVelocidad.puntos;
  if (!Array.isArray(puntos) || puntos.length < 2) {
    errores.push("calibracionVelocidad.puntos debe contener al menos dos puntos.");
  } else {
    const consignas = new Set();
    puntos.forEach((punto, indice) => {
      validarNumeroNoNegativo(punto.consignaPct, `calibracionVelocidad.puntos[${indice}].consignaPct`, errores);
      validarNumeroNoNegativo(punto.velocidadMs, `calibracionVelocidad.puntos[${indice}].velocidadMs`, errores);
      if (consignas.has(punto.consignaPct)) {
        errores.push(`calibracionVelocidad.puntos contiene la consigna duplicada ${punto.consignaPct}.`);
      }
      consignas.add(punto.consignaPct);
    });
  }

  if (errores.length) {
    throw new Error(`Configuracion invalida del tunel:\n- ${errores.join("\n- ")}`);
  }

  return true;
}

validarFichaTunel(FICHA_TUNEL_ACTIVO);

