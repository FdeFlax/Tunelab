import {
  actualizarEnsayoEnLista,
  crearEnsayo,
  crearEstadoTunelBase,
  convertirMedicionAResumen,
  eliminarEnsayoDeLista,
  eliminarMedicionDeEnsayos,
  generarCodigoEnsayo,
  limitarValor,
  limitarAlarmasPorCategoria,
  renombrarMedicionEnEnsayos,
} from "./estadoTunel";

function crearTunelReal() {
  let estado = {
    ...crearEstadoTunelBase(),
    modoControl: "Pendiente de conexion",
    etiquetaEnsayo: "Pendiente de conexion",
    estadoTunel: "DESCONECTADO",
    daq: "Sin conexion",
    conVariador: "Sin conexion",
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
    motorKw: 0,
    rpm: 0,
    tiempoSeg: 0,
    alarmas: [
      {
        id: "modo-real-sin-conexion",
        hora: "--:--",
        nivel: "info",
        etiqueta: "Info",
        mensaje:
          "Modo real preparado. Falta conectar la fuente de datos del tunel.",
      },
    ],
  };

  const suscriptores = new Set();

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

  function publicarSinConexion(accion, cambios = {}) {
    estado = {
      ...estado,
      ...cambios,
      marcaAct: Date.now(),
      ultimaOrden: `Solicitud pendiente: ${accion}`,
      horaUltimaOrden: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      alarmas: limitarAlarmasPorCategoria([
        {
          id: `accion-${accion}-${Date.now()}`,
          hora: new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          nivel: "info",
          etiqueta: "Info",
          mensaje: `La accion "${accion}" queda pendiente hasta conectar el modo real.`,
        },
        ...estado.alarmas,
      ]),
    };

    notificarCambios();
  }

  return {
    modo: "real",
    iniciar() {},
    suscribirse,
    obtenerEstado,
    actualizarPotencia(potencia) {
      const potenciaNormalizada = limitarValor(Number(potencia) || 0, 0, 100);
      publicarSinConexion(`solicitar potencia ${potenciaNormalizada}%`, {
        objPotPct: potenciaNormalizada,
      });
    },
    actualizarConsignaVelocidad(velocidad) {
      const velocidadNormalizada = Number(
        limitarValor(Number(velocidad) || 0, 0, 25).toFixed(1)
      );

      publicarSinConexion(`actualizar velocidad a ${velocidadNormalizada} m/s`, {
        consignaVelocidadMs: velocidadNormalizada,
      });
    },
    actualizarObjetivos(objetivos = {}) {
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

      publicarSinConexion("actualizar objetivos de ensayo", cambios);
    },
    cambiarModoControl(modo) {
      if (!modo) {
        return;
      }

      publicarSinConexion(`cambiar modo a ${modo}`, { modoControl: modo });
    },
    crearEnsayo(datos) {
      const codigo = datos?.codigo || generarCodigoEnsayo(estado.ensayos);
      const ensayoNuevo = crearEnsayo({
        codigo,
        nombre: datos?.nombre || "Ensayo pendiente",
        objetivo: datos?.objetivo || "Pendiente de definir",
        descripcion: datos?.descripcion || "",
      });

      publicarSinConexion(`crear ensayo ${codigo}`, {
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

      publicarSinConexion("cargar ensayos guardados", {
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

      publicarSinConexion(`activar ensayo ${ensayoSeleccionado.codigo}`, {
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

      publicarSinConexion(`actualizar ensayo ${ensayoActualizado.codigo}`, {
        ensayos: ensayosActualizados,
        etiquetaEnsayo: estado.ensayoActivoId === idEnsayo ? ensayoActualizado.codigo : estado.etiquetaEnsayo,
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

      publicarSinConexion(`eliminar ensayo ${ensayoEliminado.codigo}`, {
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

      publicarSinConexion(`renombrar medicion a ${nombreLimpio}`, {
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

      publicarSinConexion("eliminar medicion", {
        ensayos: ensayosActualizados,
        resumenUltMed: eraUltimaVisible
          ? convertirMedicionAResumen(ensayoActualizado?.mediciones?.[0] || null)
          : estado.resumenUltMed,
      });
    },
    encenderTunel() {
      publicarSinConexion("encender tunel");
    },
    apagarTunel() {
      publicarSinConexion("apagar tunel");
    },
    iniciarMedicion() {
      publicarSinConexion("iniciar medicion");
    },
    detenerMedicion() {
      publicarSinConexion("detener medicion");
    },
  };
}

const tunelReal = crearTunelReal();

export default tunelReal;





