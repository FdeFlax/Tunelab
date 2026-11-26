import { useMemo, useState } from 'react';
import {
  borrarEnsayoApi,
  listarEnsayosApi,
  listarMedicionesEnsayoApi,
  borrarMedicionApi,
  cargarMedicionApiCompleta,
} from "../servicios/api/registroApi";
import { descargarArchivoMed, descargarZipEnsayo } from '../servicios/archivos/medicionArchivo';
import { crearClaveEnsayoImportado } from '../servicios/archivos/registroAlmacenamiento';
import { formatearFecha, formatearHora } from '../servicios/formato';
import { useArchivosRegistro } from './useArchivosRegistro';
import { useCatalogoEnsayos, useDetalleMedicion } from './useEnsayos';

function coincideBusquedaEnsayo(ensayo, texto) {
  if (!texto) return true;

  return [
    ensayo.nombre,
    ensayo.objetivo,
    ensayo.usuario?.nombre,
    ensayo.usuario?.identificador_uacloud,
  ].some((valor) => String(valor ?? "").toLocaleLowerCase("es").includes(texto));
}

function coincideBusquedaMedicion(elemento, texto) {
  if (!texto) return true;

  const medicion = elemento.medicion || elemento;
  const fecha = medicion.creado_en
    ? `${formatearFecha(medicion.creado_en)} ${formatearHora(medicion.creado_en)}`
    : `${medicion.fecha || ""} ${medicion.hora || ""}`;

  return [
    medicion.id,
    medicion.nombre,
    fecha,
    elemento.nombreArchivo,
    medicion.duracion_segundos,
    medicion.velocidad_media,
    medicion.totalMuestras,
    medicion.total_muestras,
  ].some((valor) => String(valor ?? "").toLocaleLowerCase("es").includes(texto));
}

export default function useRegistro() {
  const {
    ensayos: ensayosApi, setEnsayos: setEnsayosApi, ensayo: ensayoApiSeleccionado,
    setEnsayoId: setEnsayoApiSeleccionadoId, mediciones: medicionesGuardadas,
    setMediciones: setMedicionesApi, conteos: conteoMedicionesApi,
    medicionId: medicionApiSeleccionadaId, setMedicionId: setMedicionApiSeleccionadaId,
    setRevision, error: errorApi, setError: setErrorApi, recargar: cargarEnsayosApi,
  } = useCatalogoEnsayos({ listarEnsayos: listarEnsayosApi, listarMediciones: listarMedicionesEnsayoApi,
    mensajeError: "No se ha podido conectar con MySQL." });
  const archivos = useArchivosRegistro();
  const {
    archivosCargados, setArchivosCargados, setArchivoSeleccionadoId,
    setGrupoArchivoSeleccionadoId, errorImportacion, setErrorImportacion, importando,
    inputArchivoRef, ensayosImportados, archivoSeleccionado, medicionArchivoSeleccionada,
    grupoArchivoSeleccionado,
  } = archivos;
  const [busquedaEnsayos, setBusquedaEnsayos] = useState("");
  const [busquedaMediciones, setBusquedaMediciones] = useState("");
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState("api");
  const apiDisponible = !errorApi;
  const usaApi = apiDisponible && fuenteSeleccionada !== "archivo";
  const medicionesApi = useMemo(
    () => usaApi && ensayosApi.length ? medicionesGuardadas : [],
    [usaApi, ensayosApi.length, medicionesGuardadas]
  );

  const textoBusquedaEnsayos = busquedaEnsayos.trim().toLocaleLowerCase("es");
  const ensayosApiFiltrados = useMemo(
    () => ensayosApi.filter((ensayo) => coincideBusquedaEnsayo(ensayo, textoBusquedaEnsayos)),
    [ensayosApi, textoBusquedaEnsayos]
  );
  const ensayosImportadosFiltrados = useMemo(
    () => ensayosImportados.filter((grupo) => coincideBusquedaEnsayo(grupo.ensayo, textoBusquedaEnsayos)),
    [ensayosImportados, textoBusquedaEnsayos]
  );
  const textoBusquedaMediciones = busquedaMediciones.trim().toLocaleLowerCase("es");
  const medicionesApiFiltradas = useMemo(
    () => medicionesApi.filter((medicion) => coincideBusquedaMedicion(medicion, textoBusquedaMediciones)),
    [medicionesApi, textoBusquedaMediciones]
  );
  const hayEnsayosGuardados = (apiDisponible && ensayosApi.length > 0) || ensayosImportados.length > 0;
  const hayEnsayosVisibles = (apiDisponible && ensayosApiFiltrados.length > 0) || ensayosImportadosFiltrados.length > 0;

  const medicionApiSeleccionada =
    medicionesApi.find((medicion) => medicion.id === medicionApiSeleccionadaId) ||
    null;
  const medicionesArchivoFiltradas = useMemo(
    () => (grupoArchivoSeleccionado?.archivos || []).filter((archivo) =>
      coincideBusquedaMedicion(archivo, textoBusquedaMediciones)
    ),
    [grupoArchivoSeleccionado, textoBusquedaMediciones]
  );
  const ensayoArchivoSeleccionado =
    grupoArchivoSeleccionado?.ensayo || archivoSeleccionado?.ensayo || null;
  const { medicionApiDetalle, setMedicionApiDetalle, errorDetalle, cargandoDetalle } =
    useDetalleMedicion(medicionApiSeleccionada, usaApi);
  const medicionSeleccionada = usaApi ? medicionApiDetalle : medicionArchivoSeleccionada;

  function seleccionarEnsayoApi(idEnsayo) {
    setFuenteSeleccionada("api");
    setEnsayoApiSeleccionadoId(idEnsayo);
    setMedicionApiSeleccionadaId(null);
    setMedicionApiDetalle(null);
  }

  function seleccionarEnsayoImportado(grupo) {
    setFuenteSeleccionada("archivo");
    setGrupoArchivoSeleccionadoId(grupo.id);
    setArchivoSeleccionadoId(null);
  }

  async function importarArchivos(evento) {
    if (await archivos.importar(evento)) setFuenteSeleccionada("archivo");
  }

  function limpiarArchivos() {
    setArchivosCargados([]);
    setArchivoSeleccionadoId(null);
    setGrupoArchivoSeleccionadoId(null);
    setErrorImportacion("");
    setFuenteSeleccionada("api");
  }

  function abrirSelectorArchivo() {
    inputArchivoRef.current?.click();
  }

  function descargarMedicionRegistro() {
    if (!medicionSeleccionada) return;

    const ensayoDescarga = usaApi ? ensayoApiSeleccionado : ensayoArchivoSeleccionado;
    descargarArchivoMed({
      ensayo: ensayoDescarga,
      medicion: medicionSeleccionada,
      fuenteTunel: usaApi ? "mysql" : "archivo",
    });
  }

  async function descargarMedicionApiRegistro(evento, medicion) {
    evento.stopPropagation();
    setMedicionApiSeleccionadaId(medicion.id);

    try {
      const medicionDescarga = await cargarMedicionApiCompleta(medicion);
      descargarArchivoMed({
        ensayo: ensayoApiSeleccionado,
        medicion: medicionDescarga,
        fuenteTunel: "mysql",
      });
    } catch {
      setErrorApi("No se ha podido descargar la medicion.");
    }
  }

  function descargarMedicionImportadaRegistro(evento, archivo) {
    evento.stopPropagation();
    setArchivoSeleccionadoId(archivo.id);
    descargarArchivoMed({
      ensayo: archivo.ensayo,
      medicion: archivo.medicion,
      fuenteTunel: "archivo",
    });
  }

  async function borrarMedicionApiRegistro(evento, medicion) {
    evento.stopPropagation();

    const confirmado = window.confirm(
      `Vas a borrar la medicion "${medicion.nombre}". Esta accion no se puede deshacer.`
    );

    if (!confirmado) return;

    try {
      await borrarMedicionApi(medicion.id);
      const restantes = medicionesApi.filter((item) => item.id !== medicion.id);
      setMedicionesApi(restantes);
      setMedicionApiSeleccionadaId((actual) => (actual === medicion.id ? restantes[0]?.id || null : actual));
      setMedicionApiDetalle((actual) => (actual?.id === `api-medicion-${medicion.id}` ? null : actual));
      await cargarEnsayosApi();
    } catch {
      setErrorApi("No se ha podido borrar la medicion.");
    }
  }

  function borrarMedicionImportadaRegistro(evento, archivo) {
    evento.stopPropagation();

    const confirmado = window.confirm(
      `Vas a quitar la medicion "${archivo.medicion.nombre}" del visor.`
    );

    if (!confirmado) return;

    const restantes = archivosCargados.filter((item) => item.id !== archivo.id);
    setArchivosCargados(restantes);
    setArchivoSeleccionadoId((actual) => (actual === archivo.id ? restantes[0]?.id || null : actual));
  }

  async function borrarMedicionRegistro() {
    if (usaApi && medicionApiSeleccionada?.id) {
      await borrarMedicionApiRegistro({ stopPropagation: () => {} }, medicionApiSeleccionada);
      return;
    }

    if (archivoSeleccionado?.id) {
      borrarMedicionImportadaRegistro({ stopPropagation: () => {} }, archivoSeleccionado);
    }
  }

  async function descargarEnsayoApiRegistro(evento, ensayo) {
    evento.stopPropagation();

    try {
      const mediciones = await listarMedicionesEnsayoApi(ensayo.id);
      const medicionesDetalle = await Promise.all(
        mediciones.map(medicion => cargarMedicionApiCompleta(medicion))
      );

      descargarZipEnsayo({
        ensayo,
        mediciones: medicionesDetalle,
        fuenteTunel: "mysql",
      });
    } catch {
      setErrorApi("No se ha podido descargar el ensayo.");
    }
  }

  function descargarEnsayoImportadoRegistro(evento, grupo) {
    evento.stopPropagation();
    descargarZipEnsayo({
      ensayo: grupo.ensayo,
      mediciones: grupo.archivos.map((archivo) => archivo.medicion),
      fuenteTunel: "archivo",
    });
  }

  async function borrarEnsayoApiRegistro(evento, ensayo) {
    evento.stopPropagation();

    const confirmado = window.confirm(
      "Vas a borrar el ensayo \"" + ensayo.nombre + "\" y todas sus mediciones. Esta accion no se puede deshacer."
    );

    if (!confirmado) return;

    try {
      await borrarEnsayoApi(ensayo.id);
      setEnsayosApi((actuales) => actuales.filter((item) => item.id !== ensayo.id));
      setMedicionesApi([]);
      setMedicionApiSeleccionadaId(null);
      setMedicionApiDetalle(null);
      await cargarEnsayosApi({ mantenerSeleccion: false });
    } catch {
      setErrorApi("No se ha podido borrar el ensayo.");
    }
  }

  function borrarEnsayoImportadoRegistro(evento, grupo) {
    evento.stopPropagation();

    const confirmado = window.confirm(
      "Vas a quitar el ensayo importado \"" + grupo.ensayo.nombre + "\" del visor."
    );

    if (!confirmado) return;

    setArchivosCargados((actuales) =>
      actuales.filter((archivo) => crearClaveEnsayoImportado(archivo.ensayo) !== grupo.id)
    );
    setArchivoSeleccionadoId(null);
    setGrupoArchivoSeleccionadoId(null);
  }

  return {
    medicionesApi, conteoMedicionesApi, setMedicionApiSeleccionadaId,
    setRevision, errorDetalle, cargandoDetalle,
    errorApi, archivosCargados,
    setArchivoSeleccionadoId, errorImportacion, importando,
    busquedaEnsayos, setBusquedaEnsayos, busquedaMediciones,
    setBusquedaMediciones, inputArchivoRef, ensayosApiFiltrados,
    ensayosImportadosFiltrados, medicionesApiFiltradas, apiDisponible,
    usaApi, hayEnsayosGuardados, hayEnsayosVisibles,
    ensayoApiSeleccionado, medicionApiSeleccionada, archivoSeleccionado,
    grupoArchivoSeleccionado, medicionesArchivoFiltradas, ensayoArchivoSeleccionado,
    medicionSeleccionada, seleccionarEnsayoApi, seleccionarEnsayoImportado,
    importarArchivos, limpiarArchivos, abrirSelectorArchivo,
    descargarMedicionRegistro, descargarMedicionApiRegistro, descargarMedicionImportadaRegistro,
    borrarMedicionApiRegistro, borrarMedicionImportadaRegistro, borrarMedicionRegistro,
    descargarEnsayoApiRegistro, descargarEnsayoImportadoRegistro, borrarEnsayoApiRegistro,
    borrarEnsayoImportadoRegistro,
  };
}
