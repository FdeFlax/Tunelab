import {
  actualizarEnsayoEnLista,
  aproximarValor,
  calcularResumenMedicion,
  crearEnsayo,
  crearEstadoTunelBase,
  crearEvento,
  crearRegistroMedicion,
  crearMuestraMedicion,
  convertirMedicionAResumen,
  eliminarEnsayoDeLista,
  eliminarMedicionDeEnsayos,
  generarCodigoEnsayo,
  guardarMedicionEnEnsayo,
  limitarValor,
  limitarAlarmasPorCategoria,
  renombrarMedicionEnEnsayos,
} from "./estadoTunel";

function crearTunelSimulado() {
  let estado = crearEstadoTunelBase();
  let temporizador = null;
  const suscriptores = new Set();

  function obtenerHoraActual() {
    return new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function notificarCambios() {
    suscriptores.forEach((suscriptor) => suscriptor());
  }

  function publicarEstado(cambios, ultimaOrden) {
    estado = {
      ...estado,
      ...cambios,
      marcaAct: Date.now(),
      ...(ultimaOrden
        ? {
            ultimaOrden,
            horaUltimaOrden: obtenerHoraActual(),
          }
        : {}),
    };

    notificarCambios();
  }

  function registrarEvento(nivel, mensaje, etiqueta) {
    const eventoNuevo = crearEvento({ nivel, mensaje, etiqueta });

    estado = {
      ...estado,
      marcaAct: Date.now(),
      alarmas: limitarAlarmasPorCategoria([eventoNuevo, ...estado.alarmas]),
      eventosMedicion: estado.medActiva
        ? [eventoNuevo, ...estado.eventosMedicion].slice(0, 12)
        : estado.eventosMedicion,
    };

    notificarCambios();
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
          }),
        ];

    const resumen = calcularResumenMedicion({
      muestras,
      eventos: estado.eventosMedicion,
      objVelMs: estado.objVelMs,
      objTempC: estado.objTempC,
      objPotPct: estado.objPotPct,
    });

    return {
      ...resumen,
      nombre: estado.nombreMedicionActiva || resumen.nombre,
    };
  }

  function guardarResumenEnEnsayo(resumen) {
    if (!resumen) {
      return null;
    }

    const medicion = crearRegistroMedicion({
      resumen,
      estadoTunel: estado,
    });
    const medicionConNombre = estado.nombreMedicionActiva
      ? {
          ...medicion,
          nombre: estado.nombreMedicionActiva,
        }
      : medicion;
    const ensayosActualizados = guardarMedicionEnEnsayo(
      estado.ensayos,
      estado.ensayoActivoId,
      medicionConNombre
    );
    const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === estado.ensayoActivoId);
    const medicionGuardada = ensayoActualizado?.mediciones?.[0] || medicionConNombre;

    estado = {
      ...estado,
      ensayos: ensayosActualizados,
      resumenUltMed: resumen,
    };

    return medicionGuardada;
  }

  function recalcularTelemetria() {
    const tunelEncendido = estado.estadoTunel === "RUNNING";
    const modoAutomatico = estado.modoControl === "Automatico";
    const potenciaObjetivoAutomatico = tunelEncendido
      ? limitarValor((estado.consignaVelocidadMs / 18.2) * 100, 0, 100)
      : 0;
    let potenciaObjetivo = 0;

    if (tunelEncendido) {
      potenciaObjetivo = estado.objPotPct;
    }

    if (modoAutomatico) {
      potenciaObjetivo = potenciaObjetivoAutomatico;
    }

    const nuevaPotencia = Math.round(aproximarValor(estado.potPct, potenciaObjetivo, 2.4));
    const factorPotencia = nuevaPotencia / 100;
    const velocidadObjetivo = tunelEncendido
      ? modoAutomatico
        ? estado.consignaVelocidadMs
        : factorPotencia * 18.2
      : 0;
    const temperaturaObjetivo = tunelEncendido ? 22 + factorPotencia * 7.4 : 21.2;
    const frecuenciaObjetivo = tunelEncendido ? factorPotencia * 61.5 : 0;
    const corrienteObjetivo = tunelEncendido ? 7.2 + factorPotencia * 17.5 : 0;
    const potenciaMotorObjetivo = tunelEncendido ? factorPotencia * 11.1 : 0;
    const rpmObjetivo = tunelEncendido ? factorPotencia * 2140 : 0;

    const nuevaVelocidad = Number(
      aproximarValor(estado.velMs, velocidadObjetivo, 0.45).toFixed(1)
    );
    const nuevaTemperatura = Number(
      aproximarValor(estado.tempC, temperaturaObjetivo, 0.12).toFixed(1)
    );
    const nuevaFrecuencia = Number(
      aproximarValor(estado.frecHz, frecuenciaObjetivo, 0.7).toFixed(1)
    );
    const nuevaCorriente = Number(
      aproximarValor(estado.corrA, corrienteObjetivo, 0.35).toFixed(1)
    );
    const nuevaPotenciaMotor = Number(
      aproximarValor(estado.motorKw, potenciaMotorObjetivo, 0.22).toFixed(1)
    );
    const nuevasRpm = Math.round(aproximarValor(estado.rpm, rpmObjetivo, 28));
    const nuevoTiempoMedicion =
      estado.medSeg + (estado.medActiva ? 1 : 0);
    const nuevasMuestrasMedicion = estado.medActiva
      ? [
          ...estado.muestrasMedicion,
          crearMuestraMedicion({
            segundo: nuevoTiempoMedicion,
            velMs: nuevaVelocidad,
            tempC: nuevaTemperatura,
            potPct: nuevaPotencia,
          }),
        ].slice(-180)
      : estado.muestrasMedicion;

    estado = {
      ...estado,
      marcaAct: Date.now(),
      potPct: nuevaPotencia,
      velMs: nuevaVelocidad,
      tempC: nuevaTemperatura,
      frecHz: nuevaFrecuencia,
      corrA: nuevaCorriente,
      motorKw: nuevaPotenciaMotor,
      rpm: nuevasRpm,
      estadoVar: tunelEncendido ? "En marcha" : "Disponible",
      medSeg: nuevoTiempoMedicion,
      muestrasMedicion: nuevasMuestrasMedicion,
      tiempoSeg:
        estado.tiempoSeg + (tunelEncendido ? 1 : 0),
    };

    if (tunelEncendido && nuevaTemperatura >= 29.5) {
      const yaExiste = estado.alarmas.some(
        (alarma) =>
          alarma.nivel === "advertencia" &&
          alarma.mensaje === "Temperatura elevada en simulacion por alta potencia."
      );

      if (!yaExiste) {
        estado = {
          ...estado,
          alarmas: limitarAlarmasPorCategoria([
            crearEvento({
              nivel: "advertencia",
              etiqueta: "Advertencia",
              mensaje: "Temperatura elevada en simulacion por alta potencia.",
            }),
            ...estado.alarmas,
          ]),
        };
      }
    }

    notificarCambios();
  }

  function iniciar() {
    if (temporizador !== null) {
      return;
    }

    temporizador = window.setInterval(recalcularTelemetria, 1000);
  }

  function suscribirse(suscriptor) {
    iniciar();
    suscriptores.add(suscriptor);

    return () => {
      suscriptores.delete(suscriptor);
    };
  }

  function obtenerEstado() {
    return estado;
  }

  function actualizarPotencia(potencia) {
    const potenciaNormalizada = limitarValor(Number(potencia) || 0, 0, 100);
    publicarEstado(
      { objPotPct: potenciaNormalizada },
      `Consigna de potencia solicitada a ${potenciaNormalizada}%`
    );
  }

  function actualizarConsignaVelocidad(velocidad) {
    const velocidadNormalizada = Number(
      limitarValor(Number(velocidad) || 0, 0, 25).toFixed(1)
    );

    publicarEstado(
      { consignaVelocidadMs: velocidadNormalizada },
      `Consigna de velocidad ajustada a ${velocidadNormalizada} m/s`
    );
  }

  function actualizarObjetivos(objetivos = {}) {
    const cambios = {};

    if (Object.hasOwn(objetivos, "objVelMs")) {
      cambios.objVelMs = Number(
        limitarValor(Number(objetivos.objVelMs) || 0, 0, 25).toFixed(1)
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

    if (!Object.keys(cambios).length) {
      return;
    }

    publicarEstado(cambios, "Objetivos de ensayo actualizados");
    registrarEvento("info", "Objetivos de velocidad y potencia ajustados.", "Info");
  }

  function cambiarModoControl(modo) {
    if (!modo || modo === estado.modoControl) {
      return;
    }

    publicarEstado({ modoControl: modo }, `Cambio de modo a ${modo}`);
    registrarEvento("info", `Modo de control actualizado a ${modo}.`, "Info");
  }

  function activarEnsayo(idEnsayo) {
    const ensayoSeleccionado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

    if (!ensayoSeleccionado) {
      return null;
    }

    publicarEstado(
      {
        etiquetaEnsayo: ensayoSeleccionado.codigo,
        ensayoActivoId: ensayoSeleccionado.id,
      },
      `Ensayo ${ensayoSeleccionado.codigo} preparado para control`
    );

    registrarEvento(
      "info",
      `Ensayo ${ensayoSeleccionado.codigo} activado para iniciar el control.`,
      "Info"
    );

    return ensayoSeleccionado;
  }

  function cargarEnsayosPersistidos(ensayosPersistidos = []) {
    if (!Array.isArray(ensayosPersistidos)) {
      return;
    }

    const ensayoActivoActual = estado.ensayoActivoId
      ? ensayosPersistidos.find((ensayo) => ensayo.id === estado.ensayoActivoId)
      : null;
    const ensayoActivo = ensayoActivoActual || ensayosPersistidos[0] || null;

    publicarEstado(
      {
        ensayos: ensayosPersistidos,
        ensayoActivoId: ensayoActivo?.id || null,
        etiquetaEnsayo: ensayoActivo?.codigo || "Sin ficha preparada",
        resumenUltMed: convertirMedicionAResumen(ensayoActivo?.mediciones?.[0] || null),
      },
      ensayoActivo
        ? `Ficha ${ensayoActivo.codigo} recuperada de la base de datos`
        : "No hay fichas guardadas para recuperar"
    );
  }

  function renombrarMedicion(idEnsayo, idMedicion, nombre) {
    const nombreLimpio = String(nombre || "").trim();

    if (!nombreLimpio) {
      return;
    }

    estado = {
      ...estado,
      ensayos: renombrarMedicionEnEnsayos(
        estado.ensayos,
        idEnsayo,
        idMedicion,
        nombreLimpio
      ),
      marcaAct: Date.now(),
      ultimaOrden: `Medicion renombrada a ${nombreLimpio}`,
      horaUltimaOrden: obtenerHoraActual(),
    };

    notificarCambios();
    registrarEvento("info", `Medicion renombrada a ${nombreLimpio}.`, "Info");
  }

  function eliminarMedicion(idEnsayo, idMedicion) {
    const ensayoObjetivo = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);
    const medicionEliminada = ensayoObjetivo?.mediciones?.find(
      (medicion) => medicion.id === idMedicion
    );

    if (!medicionEliminada) {
      return;
    }

    const eraUltimaVisible =
      idEnsayo === estado.ensayoActivoId &&
      ensayoObjetivo?.mediciones?.[0]?.id === idMedicion;
    const ensayosActualizados = eliminarMedicionDeEnsayos(estado.ensayos, idEnsayo, idMedicion);
    const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === idEnsayo);

    estado = {
      ...estado,
      ensayos: ensayosActualizados,
      resumenUltMed: eraUltimaVisible
        ? convertirMedicionAResumen(ensayoActualizado?.mediciones?.[0] || null)
        : estado.resumenUltMed,
      marcaAct: Date.now(),
      ultimaOrden: `Medicion ${medicionEliminada.nombre} eliminada`,
      horaUltimaOrden: obtenerHoraActual(),
    };

    notificarCambios();
    registrarEvento("info", `Medicion ${medicionEliminada.nombre} eliminada.`, "Info");
  }

  function crearNuevoEnsayo(datos) {
    const codigo = datos?.codigo || generarCodigoEnsayo(estado.ensayos);
    const ensayoNuevo = crearEnsayo({
      codigo,
      nombre: datos?.nombre || "Ensayo sin nombre",
      objetivo: datos?.objetivo || "Sin objetivo definido",
      descripcion: datos?.descripcion || "",
    });

    publicarEstado(
      {
        ensayos: [ensayoNuevo, ...estado.ensayos],
        etiquetaEnsayo: ensayoNuevo.codigo,
        ensayoActivoId: ensayoNuevo.id,
        resumenUltMed: null,
        muestrasMedicion: [],
        eventosMedicion: [],
      },
      `Ficha ${ensayoNuevo.codigo} preparada`
    );

    registrarEvento(
      "info",
      `Ficha ${ensayoNuevo.codigo} preparada para la siguiente medicion.`,
      "Info"
    );

    return ensayoNuevo;
  }


  function actualizarEnsayo(idEnsayo, cambios) {
    const ensayoEditado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

    if (!ensayoEditado) {
      return null;
    }

    const ensayosActualizados = actualizarEnsayoEnLista(estado.ensayos, idEnsayo, cambios);
    const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === idEnsayo);

    publicarEstado(
      {
        ensayos: ensayosActualizados,
        etiquetaEnsayo: estado.ensayoActivoId === idEnsayo ? ensayoActualizado.codigo : estado.etiquetaEnsayo,
      },
      `Ensayo ${ensayoActualizado.codigo} actualizado`
    );

    registrarEvento("info", `Ensayo ${ensayoActualizado.codigo} actualizado.`, "Info");
    return ensayoActualizado;
  }
  function eliminarEnsayo(idEnsayo) {
    const ensayoEliminado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

    if (!ensayoEliminado) {
      return false;
    }

    const ensayosActualizados = eliminarEnsayoDeLista(estado.ensayos, idEnsayo);
    const eraActivo = estado.ensayoActivoId === idEnsayo;
    const siguienteActivo = eraActivo ? ensayosActualizados[0] || null : null;

    publicarEstado(
      {
        ensayos: ensayosActualizados,
        ensayoActivoId: eraActivo ? siguienteActivo?.id || null : estado.ensayoActivoId,
        etiquetaEnsayo: eraActivo
          ? siguienteActivo?.codigo || "Sin ensayo activo"
          : estado.etiquetaEnsayo,
        resumenUltMed: eraActivo
          ? convertirMedicionAResumen(siguienteActivo?.mediciones?.[0] || null)
          : estado.resumenUltMed,
      },
      `Ensayo ${ensayoEliminado.codigo} eliminado`
    );

    registrarEvento("info", `Ensayo ${ensayoEliminado.codigo} eliminado.`, "Info");
    return true;
  }

  function encenderTunel() {
    publicarEstado(
      {
        estadoTunel: "RUNNING",
        estadoVar: "En marcha",
      },
      "Arranque solicitado al tunel"
    );
    registrarEvento("info", "Tunel encendido en modo simulado.", "Info");
  }

  function apagarTunel() {
    const resumenUltMed = estado.medActiva
      ? crearResumenActualMedicion()
      : estado.resumenUltMed;

    if (estado.medActiva && resumenUltMed) {
      guardarResumenEnEnsayo(resumenUltMed);
    }

    publicarEstado(
      {
        estadoTunel: "READY",
        medActiva: false,
        estadoVar: "Disponible",
        resumenUltMed,
        muestrasMedicion: [],
        eventosMedicion: [],
        nombreMedicionActiva: null,
      },
      "Parada solicitada al tunel"
    );

    registrarEvento("info", "Tunel apagado en modo simulado.", "Info");
  }

  function iniciarMedicion(opciones = {}) {
    if (estado.estadoTunel !== "RUNNING") {
      registrarEvento(
        "advertencia",
        "No se puede iniciar la medicion con el tunel detenido.",
        "Advertencia"
      );
      return false;
    }

    const nombreMedicion = String(opciones.nombreMed || "").trim();
    let ensayosActualizados = estado.ensayos;

    if (nombreMedicion) {
      const ensayoActivo = estado.ensayos.find((ensayo) => ensayo.id === estado.ensayoActivoId);
      const medicionDuplicada = ensayoActivo?.mediciones?.find(
        (medicion) => medicion.nombre?.trim().toLowerCase() === nombreMedicion.toLowerCase()
      );

      if (medicionDuplicada && !opciones.confirmarSobreesc) {
        registrarEvento(
          "advertencia",
          "Ya existe una medicion con ese nombre en el ensayo activo.",
          "Advertencia"
        );
        return false;
      }

      if (medicionDuplicada) {
        ensayosActualizados = eliminarMedicionDeEnsayos(
          estado.ensayos,
          estado.ensayoActivoId,
          medicionDuplicada.id
        );
      }
    }

    publicarEstado(
      {
        ensayos: ensayosActualizados,
        medActiva: true,
        medSeg: 0,
        muestrasMedicion: [],
        eventosMedicion: [],
        resumenUltMed: null,
        nombreMedicionActiva: nombreMedicion || null,
      },
      "Inicio de medicion solicitado"
    );
    registrarEvento("info", "Medicion iniciada en simulacion.", "Info");
    return true;
  }

  function detenerMedicion() {
    const resumenUltMed = crearResumenActualMedicion();

    const medicionGuardada = guardarResumenEnEnsayo(resumenUltMed);

    publicarEstado(
      {
        medActiva: false,
        resumenUltMed,
        muestrasMedicion: [],
        eventosMedicion: [],
        nombreMedicionActiva: null,
      },
      "Parada de medicion solicitada"
    );
    registrarEvento("info", "Medicion detenida en simulacion.", "Info");
    return medicionGuardada || true;
  }

  return {
    modo: "simulado",
    iniciar,
    suscribirse,
    obtenerEstado,
    actualizarPotencia,
    actualizarConsignaVelocidad,
    actualizarObjetivos,
    cambiarModoControl,
    crearEnsayo: crearNuevoEnsayo,
    cargarEnsayosPersistidos,
    activarEnsayo,
    eliminarEnsayo,
    renombrarMedicion,
    eliminarMedicion,
    encenderTunel,
    apagarTunel,
    iniciarMedicion,
    detenerMedicion,
  };
}

const tunelSimulado = crearTunelSimulado();

export default tunelSimulado;









