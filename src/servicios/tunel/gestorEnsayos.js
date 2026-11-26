import {
  actualizarEnsayoEnLista,
  convertirMedicionAResumen,
  eliminarMedicionDeEnsayos,
} from "./estadoTunel";
import { crearEnsayoDesdeApi } from "../mediciones/adaptarRegistros.js";

export function crearGestorEnsayos({ obtenerEstado, registrarEvento }) {
  function crearNuevoEnsayo(datos) {
    const estado = obtenerEstado();
    const ensayoNuevo = crearEnsayoDesdeApi(datos);

    registrarEvento(`Ensayo ${ensayoNuevo.nombre} preparado`, {
      ensayos: [ensayoNuevo, ...estado.ensayos],
      ensayoActivoId: ensayoNuevo.id,
      resumenUltMed: null,
    });

    return ensayoNuevo;
  }

  function cargarEnsayosPersistidos(ensayosPersistidos = []) {
    if (!Array.isArray(ensayosPersistidos)) {
      return;
    }

    const estado = obtenerEstado();
    const ensayoActivoActual = estado.ensayoActivoId
      ? ensayosPersistidos.find((ensayo) => ensayo.id === estado.ensayoActivoId)
      : null;
    const ensayoActivo = ensayoActivoActual || (!estado.ensayoActivoId && ensayosPersistidos[0]) || null;

    registrarEvento("Ensayos guardados cargados", {
      ensayos: ensayosPersistidos,
      ensayoActivoId: ensayoActivo?.id || null,
      resumenUltMed: convertirMedicionAResumen(ensayoActivo?.mediciones?.[0] || null),
    });
  }

  function activarEnsayo(idEnsayo) {
    const ensayoSeleccionado = obtenerEstado().ensayos.find((ensayo) => ensayo.id === idEnsayo);

    if (!ensayoSeleccionado) {
      return null;
    }

    registrarEvento(`Ensayo ${ensayoSeleccionado.nombre} activado`, {
      ensayoActivoId: ensayoSeleccionado.id,
    });

    return ensayoSeleccionado;
  }

  function actualizarEnsayo(idEnsayo, cambios) {
    const estado = obtenerEstado();
    const ensayoEditado = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);

    if (!ensayoEditado) {
      return null;
    }

    const ensayosActualizados = actualizarEnsayoEnLista(estado.ensayos, idEnsayo, cambios);
    const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === idEnsayo);

    registrarEvento(`Ensayo ${ensayoActualizado.nombre} actualizado`, {
      ensayos: ensayosActualizados,
    });

    return ensayoActualizado;
  }

  function eliminarMedicion(idEnsayo, idMedicion) {
    const estado = obtenerEstado();
    const ensayoObjetivo = estado.ensayos.find((ensayo) => ensayo.id === idEnsayo);
    const eraUltimaVisible =
      idEnsayo === estado.ensayoActivoId &&
      ensayoObjetivo?.mediciones?.[0]?.id === idMedicion;
    const ensayosActualizados = eliminarMedicionDeEnsayos(estado.ensayos, idEnsayo, idMedicion);
    const ensayoActualizado = ensayosActualizados.find((ensayo) => ensayo.id === idEnsayo);

    registrarEvento("Medicion eliminada", {
      ensayos: ensayosActualizados,
      resumenUltMed: eraUltimaVisible
        ? convertirMedicionAResumen(ensayoActualizado?.mediciones?.[0] || null)
        : estado.resumenUltMed,
    });
  }

  return {
    crearNuevoEnsayo,
    cargarEnsayosPersistidos,
    activarEnsayo,
    actualizarEnsayo,
    eliminarMedicion,
  };
}
