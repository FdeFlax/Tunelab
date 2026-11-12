import {
  actualizarEnsayoEnLista,
  crearEnsayo,
  convertirMedicionAResumen,
  eliminarMedicionDeEnsayos,
  generarCodigoEnsayo,
} from "./estadoTunel";

export function crearGestorEnsayos({ obtenerEstado, registrarEvento }) {
  function crearNuevoEnsayo(datos) {
    const estado = obtenerEstado();
    const codigo = datos?.codigo || generarCodigoEnsayo(estado.ensayos);
    const ensayoNuevo = crearEnsayo({
      codigo,
      nombre: datos?.nombre || "Ensayo pendiente",
      objetivo: datos?.objetivo || "Pendiente de definir",
      descripcion: datos?.descripcion || "",
    });

    registrarEvento(`Ensayo ${ensayoNuevo.codigo} preparado`, {
      ensayos: [ensayoNuevo, ...estado.ensayos],
      etiquetaEnsayo: ensayoNuevo.codigo,
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
      etiquetaEnsayo: ensayoActivo?.codigo || "Sin ficha preparada",
      ensayoActivoId: ensayoActivo?.id || null,
      resumenUltMed: convertirMedicionAResumen(ensayoActivo?.mediciones?.[0] || null),
    });
  }

  function activarEnsayo(idEnsayo) {
    const ensayoSeleccionado = obtenerEstado().ensayos.find((ensayo) => ensayo.id === idEnsayo);

    if (!ensayoSeleccionado) {
      return null;
    }

    registrarEvento(`Ensayo ${ensayoSeleccionado.codigo} activado`, {
      etiquetaEnsayo: ensayoSeleccionado.codigo,
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

    registrarEvento(`Ensayo ${ensayoActualizado.codigo} actualizado`, {
      ensayos: ensayosActualizados,
      etiquetaEnsayo:
        estado.ensayoActivoId === idEnsayo ? ensayoActualizado.codigo : estado.etiquetaEnsayo,
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
