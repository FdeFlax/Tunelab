import CONFIGURACION_TUNEL from "../../../shared/tunel.json" with { type: 'json' };

export function crearFichaTunel(configuracion = CONFIGURACION_TUNEL) {
  const { geometria: g, calibracion, ...datos } = configuracion;
  const seccion = ({ anchoM, altoM }) => ({ anchoM, altoM });
  return {
    ...datos,
    geometria: {
      ...g,
      contraccion: { ...g.contraccion, entrada: seccion(g.camaraEstabilizacion), salida: seccion(g.seccionEnsayo) },
      difusor: { ...g.difusor, entrada: { ...g.difusor.entrada, ...seccion(g.seccionEnsayo) } },
    },
    calibracionVelocidad: calibracion.velocidad,
    modelo: { ...datos.modelo, toleranciaEstabilidadMs: calibracion.toleranciaEstabilidadMs,
      segundosEstabilidadRequeridos: calibracion.segundosEstabilidadRequeridos },
  };
}

export const FICHA_TUNEL_ACTIVO = crearFichaTunel();

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

export function calcularCaudalMaximoM3s(ficha = FICHA_TUNEL_ACTIVO) {
  return calcularCaudalVolumetrico(obtenerAreaSeccionEnsayo(ficha), obtenerVelocidadMaximaCalibrada(ficha));
}

export function calcularCargaAerodinamicaRelativaPct(velocidadMs, ficha = FICHA_TUNEL_ACTIVO) {
  const velocidadMaxima = obtenerVelocidadMaximaCalibrada(ficha);
  const velocidad = limitar(velocidadMs, 0, velocidadMaxima);
  const cargaRelativa = velocidadMaxima > 0 ? (velocidad / velocidadMaxima) ** 3 : 0;

  return redondear(cargaRelativa * 100, 1);
}

export function calcularMagnitudesDerivadas({
  velocidadMs,
  ficha = FICHA_TUNEL_ACTIVO,
  temperaturaC = ficha.ambiente.temperaturaC,
  presionAtmosfericaPa = ficha.ambiente.presionAtmosfericaPa,
} = {}) {
  const areaEnsayo = obtenerAreaSeccionEnsayo(ficha);
  const areaCamara = obtenerAreaCamaraEstabilizacion(ficha);
  const entradaDifusor = ficha.geometria.difusor.entrada;
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

