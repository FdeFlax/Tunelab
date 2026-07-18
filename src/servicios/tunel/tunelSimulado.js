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
  calcularPresionPitotPa,
  CORRIENTE_MAXIMA_SIMULADA_A,
  SEGUNDOS_ESTABILIDAD_REQUERIDOS,
  TOLERANCIA_ESTABILIDAD_MS,
  VELOCIDAD_MAXIMA_SIMULADA_MS,
  renombrarMedicionEnEnsayos,
} from "./estadoTunel";
import {
  FICHA_TUNEL_ACTIVO,
  calcularDensidadAire,
  calcularFrecuenciaPorConsigna,
  calcularMagnitudesDerivadas,
  calcularCargaAerodinamicaRelativaPct,
  calcularConsignaPorVelocidad,
  calcularPresionDinamica,
  calcularRpmPorConsigna,
  calcularVelocidadPitot,
  calcularVelocidadPorConsigna,
  crearGeneradorAleatorio,
  generarRuidoNormal,
} from "./fichaTunel";

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
            frecHz: estado.frecHz,
            corrA: estado.corrA,
            rpm: estado.rpm,
            presionPa: estado.presionPa ?? calcularPresionPitotPa(estado.velMs),
            fuente: "simulado",
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
    const ficha = FICHA_TUNEL_ACTIVO;
    const tunelEncendido = estado.estadoTunel === "RUNNING";
    const tunelParando = estado.estadoTunel === "PARANDO";
    const variadorActivo = tunelEncendido || tunelParando;
    const modoAutomatico = estado.modoControl === "Automatico";
    const consignaObjetivoAutomatico = tunelEncendido
      ? limitarValor(calcularConsignaPorVelocidad(estado.consignaVelocidadMs), 0, 100)
      : 0;
    const consignaSolicitada = tunelEncendido
      ? limitarValor(modoAutomatico ? consignaObjetivoAutomatico : estado.objPotPct, 0, 100)
      : 0;
    const intervaloVisibleS = 1;
    const dtBase = ficha.dinamica.intervaloActualizacionS;
    let tiempoRestante = intervaloVisibleS;
    let consignaVariadorActual = Number(estado.consignaVariadorPct ?? estado.potPct ?? 0);
    let velocidadObjetivo = calcularVelocidadPorConsigna(consignaVariadorActual);
    let velocidadReal = Number(estado.velRealMs ?? estado.velMs ?? 0);
    let velocidadPitot = Number(estado.velPitotMs ?? estado.velMs ?? 0);
    let velocidadFiltrada = Number(estado.velFiltradaMs ?? estado.velMs ?? 0);
    let temperatura = Number(estado.tempC ?? ficha.ambiente.temperaturaC);
    let densidad = Number(estado.densidadKgM3 ?? ficha.ambiente.densidadReferenciaKgM3);
    let presionDinamica = calcularPresionDinamica(velocidadReal, densidad);
    let presionSensor = Number(estado.presionSensorPa ?? estado.presionPa ?? 0);
    const generadorRuido = crearGeneradorAleatorio(
      estado.semillaRuido ?? ficha.sensor.transductorPresion.semillaAleatoria
    );

    while (tiempoRestante > 0) {
      const dt = Math.min(dtBase, tiempoRestante, ficha.dinamica.tiempoMaximoPasoS);
      const diferenciaConsigna = variadorActivo ? consignaSolicitada - consignaVariadorActual : -consignaVariadorActual;
      const incremento = limitarValor(
        diferenciaConsigna,
        -ficha.variador.rampaBajadaPctS * dt,
        ficha.variador.rampaSubidaPctS * dt
      );

      consignaVariadorActual += incremento;
      velocidadObjetivo = calcularVelocidadPorConsigna(consignaVariadorActual);

      const alphaAire = Math.exp(-dt / ficha.dinamica.constanteTiempoFlujoS);
      velocidadReal = velocidadObjetivo + (velocidadReal - velocidadObjetivo) * alphaAire;

      densidad = calcularDensidadAire({
        ...ficha.ambiente,
        temperaturaC: temperatura,
      });
      presionDinamica = calcularPresionDinamica(velocidadReal, densidad);

      const ruidoPresion = ficha.sensor.transductorPresion.ruidoActivado
        ? generarRuidoNormal(generadorRuido, ficha.sensor.transductorPresion.desviacionRuidoPa)
        : 0;
      presionSensor = Math.max(
        0,
        presionDinamica + ficha.sensor.transductorPresion.biasPa + ruidoPresion
      );
      velocidadPitot = calcularVelocidadPitot(
        presionSensor,
        densidad,
        ficha.sensor.pitot.coeficiente
      );

      const alphaSensor = Math.exp(-dt / ficha.dinamica.constanteTiempoSensorS);
      velocidadFiltrada = velocidadPitot + (velocidadFiltrada - velocidadPitot) * alphaSensor;
      tiempoRestante = Number((tiempoRestante - dt).toFixed(6));
    }

    if (!variadorActivo) {
      consignaVariadorActual = 0;
      velocidadObjetivo = 0;
      velocidadReal = 0;
      velocidadPitot = 0;
      velocidadFiltrada = 0;
      presionDinamica = 0;
      presionSensor = 0;
    }

    const nuevaPotencia = Number(consignaVariadorActual.toFixed(1));
    const nuevaFrecuencia = calcularFrecuenciaPorConsigna(nuevaPotencia);
    const nuevasRpm = calcularRpmPorConsigna(nuevaPotencia);
    const factorVariador = limitarValor(nuevaPotencia / 100, 0, 1);
    const temperaturaObjetivo = ficha.ambiente.temperaturaC + 1.2 + factorVariador * 3.5;
    const nuevaTemperatura = Number(
      aproximarValor(estado.tempC, temperaturaObjetivo, 0.12).toFixed(1)
    );
    const nuevaCorriente = Number(
      aproximarValor(estado.corrA, factorVariador * CORRIENTE_MAXIMA_SIMULADA_A, 0.35).toFixed(1)
    );
    const nuevaVelocidad = Number(
      velocidadFiltrada.toFixed(ficha.sensor.visualizacion.decimalesVelocidad)
    );
    const nuevaVelocidadReal = Number(velocidadReal.toFixed(4));
    const nuevaVelocidadPitot = Number(velocidadPitot.toFixed(4));
    const nuevaPresionPa = Number(presionSensor.toFixed(ficha.sensor.visualizacion.decimalesPresion));
    const nuevaPresionDinamicaPa = Number(presionDinamica.toFixed(ficha.sensor.visualizacion.decimalesPresion));
    const magnitudes = calcularMagnitudesDerivadas({
      velocidadMs: nuevaVelocidadReal,
      temperaturaC: nuevaTemperatura,
      ficha,
    });
    const nuevaCargaAerodinamica = calcularCargaAerodinamicaRelativaPct(nuevaVelocidadReal);
    const diferenciaObjetivo = Math.abs(nuevaVelocidadReal - Number(velocidadObjetivo || 0));
    const flujoDentroDeRango =
      tunelEncendido && Number(velocidadObjetivo || 0) > 0 && diferenciaObjetivo <= TOLERANCIA_ESTABILIDAD_MS;
    const nuevaEstabilidadFlujoSeg = flujoDentroDeRango ? estado.estabilidadFlujoSeg + intervaloVisibleS : 0;
    const nuevoFlujoEstable = nuevaEstabilidadFlujoSeg >= SEGUNDOS_ESTABILIDAD_REQUERIDOS;
    const nuevoTiempoMedicion = estado.medSeg + (estado.medActiva ? intervaloVisibleS : 0);
    const estadoListoTrasParada =
      tunelParando &&
      nuevaPotencia <= ficha.modelo.toleranciaConsignaDetenidoPct &&
      nuevaVelocidadReal <= ficha.modelo.toleranciaVelocidadDetenidoMs;
    const estadoVariador = !variadorActivo || estadoListoTrasParada
      ? "Disponible"
      : tunelParando || velocidadReal - velocidadObjetivo > TOLERANCIA_ESTABILIDAD_MS
        ? "Parando"
        : velocidadObjetivo - velocidadReal > TOLERANCIA_ESTABILIDAD_MS
          ? "Acelerando"
          : "Estable";
    const nuevasMuestrasMedicion = estado.medActiva
      ? [
          ...estado.muestrasMedicion,
          crearMuestraMedicion({
            segundo: nuevoTiempoMedicion,
            velMs: nuevaVelocidad,
            tempC: nuevaTemperatura,
            potPct: nuevaPotencia,
            frecHz: nuevaFrecuencia,
            corrA: nuevaCorriente,
            rpm: nuevasRpm,
            presionPa: nuevaPresionPa,
            fuente: "simulado",
          }),
        ]
      : estado.muestrasMedicion;

    estado = {
      ...estado,
      marcaAct: Date.now(),
      potPct: nuevaPotencia,
      consignaPct: nuevaPotencia,
      consignaVariadorPct: nuevaPotencia,
      velMs: nuevaVelocidad,
      velocidadObjetivoMs: Number(velocidadObjetivo.toFixed(3)),
      velRealMs: nuevaVelocidadReal,
      velPitotMs: nuevaVelocidadPitot,
      velFiltradaMs: nuevaVelocidad,
      tempC: nuevaTemperatura,
      frecHz: nuevaFrecuencia,
      corrA: nuevaCorriente,
      cargaAerodinamicaRelativaPct: nuevaCargaAerodinamica,
      rpm: nuevasRpm,
      presionPa: nuevaPresionPa,
      presionSensorPa: nuevaPresionPa,
      presionDinamicaPa: nuevaPresionDinamicaPa,
      densidadKgM3: magnitudes.densidadKgM3,
      caudalM3s: magnitudes.caudalM3s,
      caudalM3h: magnitudes.caudalM3h,
      caudalMasicoKgS: magnitudes.caudalMasicoKgS,
      reynolds: magnitudes.reynolds,
      velocidadesPorSeccion: magnitudes.velocidadesPorSeccion,
      estabilidadFlujoSeg: tunelEncendido ? nuevaEstabilidadFlujoSeg : 0,
      flujoEstable: tunelEncendido ? nuevoFlujoEstable : false,
      estadoTunel: estadoListoTrasParada ? "READY" : estado.estadoTunel,
      estadoVar: estadoVariador,
      medSeg: nuevoTiempoMedicion,
      muestrasMedicion: nuevasMuestrasMedicion,
      semillaRuido: generadorRuido.obtenerSemilla(),
      tiempoSeg: estado.tiempoSeg + (tunelEncendido || tunelParando ? intervaloVisibleS : 0),
    };

    if (tunelEncendido && nuevaTemperatura >= 30) {
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

  function detener() {
    if (temporizador !== null) {
      window.clearInterval(temporizador);
      temporizador = null;
    }
  }

  function suscribirse(suscriptor) {
    iniciar();
    suscriptores.add(suscriptor);

    return () => {
      suscriptores.delete(suscriptor);

      if (suscriptores.size === 0) {
        detener();
      }
    };
  }

  function obtenerEstado() {
    return estado;
  }

  function calcularVelocidadObjetivoPorConsigna(potencia) {
    return Number(calcularVelocidadPorConsigna(limitarValor(Number(potencia) || 0, 0, 100)).toFixed(1));
  }

  function actualizarConsigna(potencia) {
    const potenciaNormalizada = limitarValor(Number(potencia) || 0, 0, 100);
    publicarEstado(
      {
        objPotPct: potenciaNormalizada,
        consignaObjetivoPct: potenciaNormalizada,
        objVelMs: calcularVelocidadObjetivoPorConsigna(potenciaNormalizada),
        velocidadObjetivoMs: calcularVelocidadObjetivoPorConsigna(potenciaNormalizada),
        estabilidadFlujoSeg: 0,
        flujoEstable: false,
      },
      `Consigna del variador solicitada a ${potenciaNormalizada}%`
    );
  }

  function actualizarConsignaVelocidad(velocidad) {
    const velocidadNormalizada = Number(
      limitarValor(Number(velocidad) || 0, 0, VELOCIDAD_MAXIMA_SIMULADA_MS).toFixed(1)
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
      cambios.consignaObjetivoPct = cambios.objPotPct;
      cambios.objVelMs = calcularVelocidadObjetivoPorConsigna(cambios.objPotPct);
      cambios.velocidadObjetivoMs = cambios.objVelMs;
      cambios.estabilidadFlujoSeg = 0;
      cambios.flujoEstable = false;
    }

    if (!Object.keys(cambios).length) {
      return;
    }

    publicarEstado(cambios, "Objetivos de ensayo actualizados");
    registrarEvento("info", "Objetivos de velocidad y consigna ajustados.", "Info");
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
        estabilidadFlujoSeg: 0,
        flujoEstable: false,
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
        estadoTunel: estado.potPct > 0 || estado.frecHz > 0 ? "PARANDO" : "READY",
        medActiva: false,
        estadoVar: estado.potPct > 0 || estado.frecHz > 0 ? "Parando" : "Disponible",
        estabilidadFlujoSeg: 0,
        flujoEstable: false,
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

    if (!estado.flujoEstable) {
      registrarEvento(
        "advertencia",
        `Espera a que el flujo se estabilice durante ${SEGUNDOS_ESTABILIDAD_REQUERIDOS} s antes de medir.`,
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
    detener,
    suscribirse,
    obtenerEstado,
    actualizarConsigna,
    actualizarPotencia: actualizarConsigna,
    actualizarConsignaVelocidad,
    actualizarObjetivos,
    cambiarModoControl,
    crearEnsayo: crearNuevoEnsayo,
    cargarEnsayosPersistidos,
    activarEnsayo,
    actualizarEnsayo,
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









