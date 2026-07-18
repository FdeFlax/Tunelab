import {
  actualizarEnsayoEnLista,
  calcularPresionPitotPa,
  calcularResumenMedicion,
  crearEnsayo,
  crearEstadoTunelBase,
  crearMuestraMedicion,
  crearRegistroMedicion,
  convertirMedicionAResumen,
  eliminarEnsayoDeLista,
  eliminarMedicionDeEnsayos,
  generarCodigoEnsayo,
  guardarMedicionEnEnsayo,
  limitarValor,
  limitarAlarmasPorCategoria,
  SEGUNDOS_ESTABILIDAD_REQUERIDOS,
  TOLERANCIA_ESTABILIDAD_MS,
  VELOCIDAD_MAXIMA_SIMULADA_MS,
  renombrarMedicionEnEnsayos,
} from "./estadoTunel";
import { calcularCargaAerodinamicaRelativaPct, calcularVelocidadPorConsigna } from "./fichaTunel";
import {
  aplicarConsignaTunelApi,
  apagarTunelApi,
  encenderTunelApi,
  iniciarMedicionTunelApi,
  detenerMedicionTunelApi,
  leerMuestraTunelApi,
  verEstadoTunelApi,
} from "../api/tunelOperativoApi";
import { escucharEventosTunel } from "../api/tunelEventosApi";

function crearHora() {
  return new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function crearEstadoRealInicial() {
  return {
    ...crearEstadoTunelBase(),
    modoControl: "Control por API",
    estadoTunel: "DESCONECTADO",
    daq: "Pendiente de backend",
    conVariador: "Pendiente de backend",
    estadoVar: "Sin enlace",
    permiteCtrl: false,
    bloqSeg: true,
    medActiva: false,
    medSeg: 0,
    potPct: 0,
    tempC: 0,
    velMs: 0,
    frecHz: 0,
    corrA: 0,
    cargaAerodinamicaRelativaPct: 0,
    rpm: 0,
    tiempoSeg: 0,
    ultimaOrden: "Modo real preparado. Esperando respuesta del backend.",
    horaUltimaOrden: crearHora(),
    alarmas: [
      {
        id: "modo-real-api",
        hora: crearHora(),
        nivel: "info",
        etiqueta: "Info",
        mensaje:
          "Modo real preparado. Las ordenes se envian al backend antes de llegar al tunel.",
      },
    ],
  };
}

function crearTunelReal() {
  let estado = crearEstadoRealInicial();
  const suscriptores = new Set();
  let iniciado = false;
  let temporizadorEstado = null;
  let temporizadorMuestras = null;
  let cerrarEventosTunel = null;
  let segundoMedicion = 0;

  function notificarCambios() {
    suscriptores.forEach((suscriptor) => suscriptor());
  }

  function suscribirse(suscriptor) {
    suscriptores.add(suscriptor);

    return () => {
      suscriptores.delete(suscriptor);
    };
  }

  function obtenerEstado() {
    return estado;
  }

  function publicar(cambios = {}) {
    estado = {
      ...estado,
      ...cambios,
      marcaAct: Date.now(),
    };

    notificarCambios();
  }

  function calcularVelocidadObjetivoPorPotencia(potencia) {
    return Number(calcularVelocidadPorConsigna(limitarValor(Number(potencia) || 0, 0, 100)).toFixed(1));
  }

  function calcularEstadoEstabilidad(velocidad, objetivo, encendido) {
    const velocidadObjetivo = Number(objetivo || 0);
    const dentroDeRango =
      encendido && velocidadObjetivo > 0 && Math.abs(Number(velocidad || 0) - velocidadObjetivo) <= TOLERANCIA_ESTABILIDAD_MS;
    const estabilidadFlujoSeg = dentroDeRango ? estado.estabilidadFlujoSeg + 1 : 0;

    return {
      estabilidadFlujoSeg,
      flujoEstable: estabilidadFlujoSeg >= SEGUNDOS_ESTABILIDAD_REQUERIDOS,
    };
  }

  function crearResumenActualMedicion() {
    const muestras = estado.muestrasMedicion.length
      ? estado.muestrasMedicion
      : [
          crearMuestraMedicion({
            segundo: Math.max(estado.medSeg, 1),
            velMs: estado.velMs,
            tempC: estado.tempC,
            potPct: estado.potPct,
            frecHz: estado.frecHz,
            corrA: estado.corrA,
            rpm: estado.rpm,
            presionPa: estado.presionPa ?? calcularPresionPitotPa(estado.velMs),
            fuente: estado.fuenteDatos || "api",
          }),
        ];

    const resumen = calcularResumenMedicion({
      muestras,
      eventos: estado.eventosMedicion,
      objVelMs: estado.objVelMs,
      objTempC: estado.objTempC,
      objPotPct: estado.objPotPct,
    });

    return resumen
      ? {
          ...resumen,
          nombre: estado.nombreMedicionActiva || resumen.nombre,
        }
      : null;
  }

  function guardarResumenEnEnsayo(resumen) {
    if (!resumen) {
      return null;
    }

    const medicion = crearRegistroMedicion({ resumen, estadoTunel: estado });
    const medicionConNombre = estado.nombreMedicionActiva
      ? { ...medicion, nombre: estado.nombreMedicionActiva }
      : medicion;
    const ensayosActualizados = guardarMedicionEnEnsayo(
      estado.ensayos,
      estado.ensayoActivoId,
      medicionConNombre
    );
    const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === estado.ensayoActivoId);
    const medicionGuardada = ensayoActualizado?.mediciones?.[0] || medicionConNombre;

    publicar({
      ensayos: ensayosActualizados,
      resumenUltMed: resumen,
    });

    return medicionGuardada;
  }

  async function capturarMuestraMedicion() {
    if (!estado.medActiva) {
      return;
    }

    try {
      const datos = await leerMuestraTunelApi();
      const segundo = segundoMedicion + 1;
      segundoMedicion = segundo;
      const velocidad = Number(Number(datos?.velocidad_ms ?? estado.velMs).toFixed(1));
      const temperatura = Number(Number(datos?.temperatura_c ?? estado.tempC).toFixed(1));
      const potencia = Math.round(Number(datos?.potencia_porcentaje ?? estado.potPct));
      const frecuencia = Number(Number(datos?.frecuencia_hz ?? estado.frecHz).toFixed(1));
      const corriente = Number(Number(datos?.corriente_a ?? estado.corrA).toFixed(1));
      const rpm = Math.round(Number(datos?.rpm ?? estado.rpm));
      const presionPa = calcularPresionPitotPa(velocidad);

      publicar({
        medSeg: segundo,
        velMs: velocidad,
        tempC: temperatura,
        potPct: potencia,
        frecHz: frecuencia,
        corrA: corriente,
        rpm,
        presionPa,
        fuenteDatos: datos?.fuente || "api",
        muestrasMedicion: [
          ...estado.muestrasMedicion,
          crearMuestraMedicion({
            segundo,
            velMs: velocidad,
            tempC: temperatura,
            potPct: potencia,
            frecHz: frecuencia,
            corrA: corriente,
            rpm,
            presionPa,
            fuente: datos?.fuente || "api",
          }),
        ],
      });
    } catch (error) {
      registrarEvento(
        `No se ha podido leer una muestra del tunel. ${error.message || "Comprueba backend y DAQ."}`,
        "advertencia"
      );
    }
  }

  function iniciarCapturaMuestras() {
    if (temporizadorMuestras || typeof window === "undefined") {
      return;
    }

    temporizadorMuestras = window.setInterval(() => {
      void capturarMuestraMedicion();
    }, 1000);
  }

  function detenerCapturaMuestras() {
    if (!temporizadorMuestras) {
      return;
    }

    window.clearInterval(temporizadorMuestras);
    temporizadorMuestras = null;
  }

  function registrarEvento(mensaje, nivel = "info", cambios = {}) {
    const hora = crearHora();

    publicar({
      ...cambios,
      ultimaOrden: mensaje,
      horaUltimaOrden: hora,
      alarmas: limitarAlarmasPorCategoria([
        {
          id: `real-${Date.now()}-${Math.random()}`,
          hora,
          nivel,
          etiqueta: nivel === "advertencia" ? "Advertencia" : "Info",
          mensaje,
        },
        ...estado.alarmas,
      ]),
    });
  }

  function aplicarEstadoBackend(datos, mensajeOrden = null) {
    const conectado = datos?.conectado_fisico !== false;
    const encendido = Boolean(datos?.encendido);
    const potenciaAplicada = limitarValor(Number(datos?.potencia_aplicada) || 0, 0, 100);
    const potenciaObjetivo = limitarValor(
      Number(datos?.potencia_objetivo ?? estado.objPotPct) || 0,
      0,
      100
    );

    const velocidadActual = Number(Number(datos?.velocidad_ms ?? 0).toFixed(1));
    const objetivoVelocidad = calcularVelocidadObjetivoPorPotencia(potenciaObjetivo);
    const estadoEstabilidad = calcularEstadoEstabilidad(
      velocidadActual,
      objetivoVelocidad,
      encendido
    );

    publicar({
      modoControl: "Control por API",
      estadoTunel: conectado ? (encendido ? "RUNNING" : "READY") : "DESCONECTADO",
      daq: conectado ? "DAQ online" : "DAQ sin conexion",
      conVariador: conectado ? "Variador online" : "Variador sin conexion",
      estadoVar: conectado ? (encendido ? "En marcha" : "Disponible") : "Sin enlace",
      permiteCtrl: conectado,
      bloqSeg: !conectado,
      medActiva: Boolean(datos?.midiendo),
      objPotPct: Math.round(potenciaObjetivo),
      objVelMs: objetivoVelocidad,
      potPct: Math.round(potenciaAplicada),
      tempC: Number(Number(datos?.temperatura_c ?? 0).toFixed(1)),
      velMs: velocidadActual,
      presionPa: calcularPresionPitotPa(velocidadActual),
      frecHz: Number(Number(datos?.frecuencia_hz ?? 0).toFixed(1)),
      corrA: Number(Number(datos?.corriente_a ?? 0).toFixed(1)),
      rpm: Math.round(Number(datos?.rpm ?? 0)),
      cargaAerodinamicaRelativaPct: calcularCargaAerodinamicaRelativaPct(velocidadActual),
      estabilidadFlujoSeg: encendido ? estadoEstabilidad.estabilidadFlujoSeg : 0,
      flujoEstable: encendido ? estadoEstabilidad.flujoEstable : false,
      fuenteDatos: datos?.fuente || "api",
      ultimaOrden: mensajeOrden || estado.ultimaOrden,
      horaUltimaOrden: mensajeOrden ? crearHora() : estado.horaUltimaOrden,
    });
  }

  async function sincronizarEstadoBackend() {
    try {
      const datos = await verEstadoTunelApi();
      aplicarEstadoBackend(datos);
    } catch {
      publicar({
        estadoTunel: "DESCONECTADO",
        daq: "Backend no disponible",
        conVariador: "Sin enlace",
        estadoVar: "Sin enlace",
        permiteCtrl: false,
        bloqSeg: true,
        medActiva: false,
        estabilidadFlujoSeg: 0,
        flujoEstable: false,
      });
    }
  }

  async function ejecutarOrden(mensaje, accionApi) {
    try {
      const datos = await accionApi();
      aplicarEstadoBackend(datos, mensaje);
      return datos;
    } catch (error) {
      registrarEvento(
        `No se pudo completar la orden: ${mensaje}. ${error.message || "Comprueba backend y conexion."}`,
        "advertencia"
      );
      return null;
    }
  }

  function registrarOperacionLocal(mensaje, cambios = {}) {
    registrarEvento(mensaje, "info", cambios);
  }

  return {
    modo: "real",
    iniciar() {
      if (iniciado) {
        return;
      }

      iniciado = true;
      sincronizarEstadoBackend();

      if (typeof window !== "undefined") {
        temporizadorEstado = window.setInterval(sincronizarEstadoBackend, 1500);
        cerrarEventosTunel = escucharEventosTunel(
          sincronizarEstadoBackend,
          sincronizarEstadoBackend
        );
      }
    },
    detener() {
      iniciado = false;

      if (temporizadorEstado) {
        window.clearInterval(temporizadorEstado);
        temporizadorEstado = null;
      }

      detenerCapturaMuestras();

      if (cerrarEventosTunel) {
        cerrarEventosTunel();
        cerrarEventosTunel = null;
      }
    },
    suscribirse,
    obtenerEstado,
    actualizarPotencia(potencia) {
      const potenciaNormalizada = Math.round(limitarValor(Number(potencia) || 0, 0, 100));

      publicar({
        objPotPct: potenciaNormalizada,
        objVelMs: calcularVelocidadObjetivoPorPotencia(potenciaNormalizada),
        estabilidadFlujoSeg: 0,
        flujoEstable: false,
      });
      ejecutarOrden(`Consigna enviada: ${potenciaNormalizada}%`, () =>
        aplicarConsignaTunelApi(potenciaNormalizada)
      );
    },
    actualizarConsignaVelocidad(velocidad) {
      const velocidadNormalizada = Number(
        limitarValor(Number(velocidad) || 0, 0, VELOCIDAD_MAXIMA_SIMULADA_MS).toFixed(1)
      );

      registrarOperacionLocal(`Referencia de velocidad actualizada a ${velocidadNormalizada} m/s`, {
        consignaVelocidadMs: velocidadNormalizada,
      });
    },
    actualizarObjetivos(objetivos = {}) {
      const cambios = {};

      if (Object.hasOwn(objetivos, "objVelMs")) {
        cambios.objVelMs = Number(
          limitarValor(Number(objetivos.objVelMs) || 0, 0, VELOCIDAD_MAXIMA_SIMULADA_MS).toFixed(1)
        );
      }

      if (Object.hasOwn(objetivos, "objTempC")) {
        cambios.objTempC = Number(
          limitarValor(Number(objetivos.objTempC) || 0, 0, 40).toFixed(1)
        );
      }

      if (Object.hasOwn(objetivos, "objPotPct")) {
        cambios.objPotPct = Math.round(
          limitarValor(Number(objetivos.objPotPct) || 0, 0, 100)
        );
      }

      registrarOperacionLocal("Objetivos de ensayo actualizados", cambios);
    },
    cambiarModoControl(modo) {
      if (!modo) {
        return;
      }

      registrarOperacionLocal(`Modo cambiado a ${modo}`, { modoControl: modo });
    },
    crearEnsayo(datos) {
      const codigo = datos?.codigo || generarCodigoEnsayo(estado.ensayos);
      const ensayoNuevo = crearEnsayo({
        codigo,
        nombre: datos?.nombre || "Ensayo pendiente",
        objetivo: datos?.objetivo || "Pendiente de definir",
        descripcion: datos?.descripcion || "",
      });

      registrarOperacionLocal(`Ensayo ${codigo} preparado en modo real`, {
        ensayos: [ensayoNuevo, ...estado.ensayos],
        etiquetaEnsayo: ensayoNuevo.codigo,
        ensayoActivoId: ensayoNuevo.id,
        resumenUltMed: null,
      });

      return ensayoNuevo;
    },
    cargarEnsayosPersistidos(ensayosPersistidos = []) {
      if (!Array.isArray(ensayosPersistidos)) {
        return;
      }

      const ensayoActivo = estado.ensayoActivoId
        ? ensayosPersistidos.find((ensayo) => ensayo.id === estado.ensayoActivoId)
        : ensayosPersistidos[0] || null;

      registrarOperacionLocal("Ensayos guardados cargados", {
        ensayos: ensayosPersistidos,
        etiquetaEnsayo: ensayoActivo?.codigo || "Sin ficha preparada",
        ensayoActivoId: ensayoActivo?.id || null,
        resumenUltMed: convertirMedicionAResumen(ensayoActivo?.mediciones?.[0] || null),
      });
    },
    activarEnsayo(idEnsayo) {
      const ensayoSeleccionado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

      if (!ensayoSeleccionado) {
        return null;
      }

      registrarOperacionLocal(`Ensayo ${ensayoSeleccionado.codigo} activado`, {
        etiquetaEnsayo: ensayoSeleccionado.codigo,
        ensayoActivoId: ensayoSeleccionado.id,
      });

      return ensayoSeleccionado;
    },
    actualizarEnsayo(idEnsayo, cambios) {
      const ensayoEditado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

      if (!ensayoEditado) {
        return null;
      }

      const ensayosActualizados = actualizarEnsayoEnLista(estado.ensayos, idEnsayo, cambios);
      const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === idEnsayo);

      registrarOperacionLocal(`Ensayo ${ensayoActualizado.codigo} actualizado`, {
        ensayos: ensayosActualizados,
        etiquetaEnsayo:
          estado.ensayoActivoId === idEnsayo ? ensayoActualizado.codigo : estado.etiquetaEnsayo,
      });

      return ensayoActualizado;
    },
    eliminarEnsayo(idEnsayo) {
      const ensayoEliminado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

      if (!ensayoEliminado) {
        return false;
      }

      const ensayosActualizados = eliminarEnsayoDeLista(estado.ensayos, idEnsayo);
      const eraActivo = estado.ensayoActivoId === idEnsayo;
      const siguienteActivo = eraActivo ? ensayosActualizados[0] || null : null;

      registrarOperacionLocal(`Ensayo ${ensayoEliminado.codigo} eliminado`, {
        ensayos: ensayosActualizados,
        etiquetaEnsayo: eraActivo
          ? siguienteActivo?.codigo || "Sin ensayo activo"
          : estado.etiquetaEnsayo,
        ensayoActivoId: eraActivo ? siguienteActivo?.id || null : estado.ensayoActivoId,
        resumenUltMed: eraActivo
          ? convertirMedicionAResumen(siguienteActivo?.mediciones?.[0] || null)
          : estado.resumenUltMed,
      });

      return true;
    },
    renombrarMedicion(idEnsayo, idMedicion, nombre) {
      const nombreLimpio = String(nombre || "").trim();

      if (!nombreLimpio) {
        return;
      }

      registrarOperacionLocal(`Medicion renombrada a ${nombreLimpio}`, {
        ensayos: renombrarMedicionEnEnsayos(
          estado.ensayos,
          idEnsayo,
          idMedicion,
          nombreLimpio
        ),
      });
    },
    eliminarMedicion(idEnsayo, idMedicion) {
      const ensayoObjetivo = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);
      const eraUltimaVisible =
        idEnsayo === estado.ensayoActivoId &&
        ensayoObjetivo?.mediciones?.[0]?.id === idMedicion;
      const ensayosActualizados = eliminarMedicionDeEnsayos(estado.ensayos, idEnsayo, idMedicion);
      const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === idEnsayo);

      registrarOperacionLocal("Medicion eliminada", {
        ensayos: ensayosActualizados,
        resumenUltMed: eraUltimaVisible
          ? convertirMedicionAResumen(ensayoActualizado?.mediciones?.[0] || null)
          : estado.resumenUltMed,
      });
    },
    async encenderTunel() {
      publicar({ estabilidadFlujoSeg: 0, flujoEstable: false });
      return ejecutarOrden(`Tunel encendido con consigna ${estado.objPotPct}%`, () =>
        encenderTunelApi(estado.objPotPct)
      );
    },
    async apagarTunel() {
      detenerCapturaMuestras();
      const resumenUltMed = estado.medActiva ? crearResumenActualMedicion() : estado.resumenUltMed;

      if (estado.medActiva && resumenUltMed) {
        guardarResumenEnEnsayo(resumenUltMed);
      }

      const resultado = await ejecutarOrden("Tunel apagado", apagarTunelApi);
      publicar({
        medActiva: false,
        medSeg: 0,
        estabilidadFlujoSeg: 0,
        flujoEstable: false,
        muestrasMedicion: [],
        eventosMedicion: [],
        nombreMedicionActiva: null,
        resumenUltMed,
      });
      segundoMedicion = 0;
      return resultado;
    },
    async iniciarMedicion(opciones = {}) {
      if (estado.estadoTunel !== "RUNNING") {
        registrarEvento("No se puede iniciar la medicion con el tunel detenido.", "advertencia");
        return false;
      }

      if (!estado.flujoEstable) {
        registrarEvento(
          `Espera a que el flujo se estabilice durante ${SEGUNDOS_ESTABILIDAD_REQUERIDOS} s antes de medir.`,
          "advertencia"
        );
        return false;
      }

      const datos = await ejecutarOrden("Medicion operativa iniciada", iniciarMedicionTunelApi);

      if (!datos) {
        return false;
      }

      segundoMedicion = 0;
      publicar({
        medActiva: true,
        medSeg: 0,
        muestrasMedicion: [],
        eventosMedicion: [],
        resumenUltMed: null,
        nombreMedicionActiva: String(opciones.nombreMed || "").trim() || null,
      });
      iniciarCapturaMuestras();
      void capturarMuestraMedicion();
      return true;
    },
    async detenerMedicion() {
      detenerCapturaMuestras();
      const resumenUltMed = crearResumenActualMedicion();
      const medicionGuardada = guardarResumenEnEnsayo(resumenUltMed);
      await ejecutarOrden("Medicion operativa detenida", detenerMedicionTunelApi);
      publicar({
        medActiva: false,
        resumenUltMed,
        muestrasMedicion: [],
        eventosMedicion: [],
        nombreMedicionActiva: null,
      });
      segundoMedicion = 0;
      return medicionGuardada || true;
    },
  };
}

const tunelReal = crearTunelReal();

export default tunelReal;
