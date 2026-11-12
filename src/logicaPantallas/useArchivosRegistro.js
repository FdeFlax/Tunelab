import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITE_ARCHIVOS_IMPORTACION, leerArchivoMedicionTunelab, comprobarCapacidadImportacion } from '../servicios/archivos/medicionArchivo';
import { agruparArchivosPorEnsayo, cargarArchivosRegistroGuardados, crearClaveEnsayoImportado, guardarArchivosRegistro } from '../servicios/archivos/registroAlmacenamiento';

export function useArchivosRegistro() {
  const [archivosCargados, setArchivosCargados] = useState(cargarArchivosRegistroGuardados);
  const [archivoSeleccionadoId, setArchivoSeleccionadoId] = useState(null);
  const [grupoArchivoSeleccionadoId, setGrupoArchivoSeleccionadoId] = useState(null);
  const [errorImportacion, setErrorImportacion] = useState("");
  const [importando, setImportando] = useState(false);
  const inputArchivoRef = useRef(null);
  const ensayosImportados = useMemo(
    () => agruparArchivosPorEnsayo(archivosCargados),
    [archivosCargados]
  );
  const archivoSeleccionado =
    archivosCargados.find((archivo) => archivo.id === archivoSeleccionadoId) ||
    null;
  const medicionArchivoSeleccionada = archivoSeleccionado?.medicion || null;
  const grupoArchivoSeleccionado =
    ensayosImportados.find((grupo) => grupo.id === grupoArchivoSeleccionadoId) ||
    (archivoSeleccionado
      ? ensayosImportados.find((grupo) =>
          grupo.id === crearClaveEnsayoImportado(archivoSeleccionado.ensayo)
        )
      : null) ||
    ensayosImportados[0] ||
    null;

  useEffect(() => {
    guardarArchivosRegistro(archivosCargados);
  }, [archivosCargados]);

  async function importar(evento) {
    const archivos = Array.from(evento.target.files || []);

    if (!archivos.length) return;

    if (archivos.length + archivosCargados.length > LIMITE_ARCHIVOS_IMPORTACION) {
      setErrorImportacion(
        `Solo se pueden mantener ${LIMITE_ARCHIVOS_IMPORTACION} archivos cargados a la vez.`
      );
      evento.target.value = "";
      return;
    }

    setImportando(true);
    setErrorImportacion("");

    try {
      const documentos = [];

      for (const archivo of archivos) {
        const documento = await leerArchivoMedicionTunelab(archivo);
        comprobarCapacidadImportacion([...archivosCargados, ...documentos], documento.medicion.muestras.length);
        documentos.push(documento);
      }

      setArchivosCargados((actuales) => [...documentos, ...actuales]);
      setGrupoArchivoSeleccionadoId(crearClaveEnsayoImportado(documentos[0]?.ensayo));
      setArchivoSeleccionadoId(null);
      return true;
    } catch (error) {
      setErrorImportacion(error.message || "No se ha podido importar el archivo.");
    } finally {
      setImportando(false);
      evento.target.value = "";
    }
  }

  return {
    archivosCargados, setArchivosCargados, archivoSeleccionadoId, setArchivoSeleccionadoId,
    grupoArchivoSeleccionadoId, setGrupoArchivoSeleccionadoId, errorImportacion, setErrorImportacion,
    importando, inputArchivoRef, ensayosImportados, archivoSeleccionado,
    medicionArchivoSeleccionada, grupoArchivoSeleccionado, importar,
  };
}
