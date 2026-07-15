import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { InformeMedicionComun } from "../components/ResumenMedicion";
import {
  borrarEnsayoApi,
  listarEnsayosApi,
  listarMedicionesEnsayoApi,
} from "../servicios/api/ensayosApi";
import {
  borrarMedicionApi,
  listarEventosMedicionApi,
  listarMuestrasMedicionApi,
} from "../servicios/api/medicionesApi";
import {
  LIMITE_ARCHIVOS_IMPORTACION,
  LIMITE_TAMANO_ARCHIVO_MEDICION_BYTES,
  descargarArchivoMed,
  descargarZipEnsayo,
  leerArchivoMedicionTunelab,
} from "../servicios/archivos/medicionArchivo";
import { formatearTiempoFuncionamiento } from "../servicios/tunel/estadoTunel";

const estilosResumenRegistro2 = {
  tarjeta: "reg2resumentarjeta",
  tarjetaEtiqueta: "reg2resumenetiqueta",
  tarjetaValor: "reg2resumenvalor",
  tarjetaApoyo: "reg2resumenapoyo",
  grafica: "reg2grafica",
  graficaCabecera: "reg2graficacabecera",
  graficaEtiqueta: "reg2graficaetiqueta",
  graficaValor: "reg2graficavalor",
  graficaObjetivo: "reg2graficaobjetivo",
  graficaSvg: "reg2graficasvg",
  graficaBase: "reg2graficabase",
  graficaPie: "reg2graficapie",
  prefijoGradiente: "registro2",
};
const TAMANO_MAXIMO_ARCHIVO_MB = Math.round(
  LIMITE_TAMANO_ARCHIVO_MEDICION_BYTES / (1024 * 1024)
);
const CLAVE_ARCHIVOS_REGISTRO = "tunelab_registro_archivos_cargados";

function cargarArchivosRegistroGuardados() {
  try {
    const guardado = sessionStorage.getItem(CLAVE_ARCHIVOS_REGISTRO);
    const archivos = JSON.parse(guardado || "[]");
    return Array.isArray(archivos) ? archivos : [];
  } catch {
    return [];
  }
}

function redondear(valor, decimales = 1) {
  return Number((Number(valor) || 0).toFixed(decimales));
}

function calcularMedia(valores) {
  if (!valores.length) {
    return 0;
  }

  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "--";
  }

  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatearHora(fecha) {
  if (!fecha) {
    return "--";
  }

  return new Date(fecha).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function crearTarjetasResumen(medicion) {
  if (!medicion) {
    return [];
  }

  return [
    {
      etiqueta: "Duracion",
      valor: formatearTiempoFuncionamiento(medicion.durSeg),
      apoyo: `${medicion.totalMuestras} muestras`,
    },
    {
      etiqueta: "Velocidad media",
      valor: `${medicion.velocidad.media} m/s`,
      apoyo: `Max ${medicion.velocidad.maxima} m/s`,
    },
    {
      etiqueta: "Estabilidad",
      valor: `${medicion.velocidad.estabilidad} m/s`,
      apoyo: "Diferencia max-min",
    },
    {
      etiqueta: "Temperatura",
      valor: `${medicion.temperatura.media} C`,
      apoyo: `Min ${medicion.temperatura.minima} C`,
    },
    {
      etiqueta: "Potencia media",
      valor: `${medicion.potencia.media}%`,
      apoyo: `Objetivo ${medicion.objPotPct}%`,
    },
    {
      etiqueta: "Incidencias",
      valor: `${medicion.eventos.length}`,
      apoyo: medicion.eventos.length ? "Eventos registrados" : "Sin incidencias",
    },
  ];
}

function MetricaRegistro2({ etiqueta, valor, apoyo }) {
  return (
    <article className="reg2metrica">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
      {apoyo ? <small>{apoyo}</small> : null}
    </article>
  );
}

function EstadoVacioRegistro2({ texto }) {
  return (
    <article className="reg2vacio">
      <p>{texto}</p>
    </article>
  );
}

function crearClaveEnsayoImportado(ensayo = {}) {
  return `${ensayo.codigo || "SIN-CODIGO"}::${ensayo.nombre || "Sin nombre"}`;
}

function agruparArchivosPorEnsayo(archivos) {
  const grupos = new Map();

  archivos.forEach((archivo) => {
    const clave = crearClaveEnsayoImportado(archivo.ensayo);

    if (!grupos.has(clave)) {
      grupos.set(clave, {
        id: clave,
        ensayo: archivo.ensayo,
        archivos: [],
        totalMuestras: 0,
      });
    }

    const grupo = grupos.get(clave);
    grupo.archivos.push(archivo);
    grupo.totalMuestras += archivo.medicion?.totalMuestras || 0;
  });

  return Array.from(grupos.values());
}

function crearMedicionDesdeApi(medicion, muestrasApi = [], eventosApi = []) {
  if (!medicion) {
    return null;
  }

  const muestras = muestrasApi.map((muestra, indice) => ({
    segundo: indice + 1,
    velMs: redondear(muestra.velocidad_ms),
    tempC: redondear(muestra.temperatura_c),
    potPct: redondear(muestra.potencia_porcentaje),
  }));
  const velocidades = muestras.map((muestra) => muestra.velMs);
  const temperaturas = muestras.map((muestra) => muestra.tempC);
  const potencias = muestras.map((muestra) => muestra.potPct);
  const velocidadMaxima = velocidades.length ? Math.max(...velocidades) : 0;
  const velocidadMinima = velocidades.length ? Math.min(...velocidades) : 0;
  const temperaturaMaxima = temperaturas.length ? Math.max(...temperaturas) : 0;
  const temperaturaMinima = temperaturas.length ? Math.min(...temperaturas) : 0;
  const potenciaMaxima = potencias.length ? Math.max(...potencias) : 0;
  const potenciaMinima = potencias.length ? Math.min(...potencias) : 0;

  return {
    id: `api-medicion-${medicion.id}`,
    nombre: medicion.nombre,
    fecha: formatearFecha(medicion.creado_en),
    hora: formatearHora(medicion.creado_en),
    durSeg: medicion.duracion_segundos || muestras.length,
    totalMuestras: muestras.length,
    objVelMs: redondear(medicion.velocidad_objetivo),
    objPotPct: redondear(medicion.potencia_objetivo),
    velocidad: {
      media: redondear(medicion.velocidad_media ?? calcularMedia(velocidades)),
      maxima: redondear(medicion.velocidad_maxima ?? velocidadMaxima),
      minima: redondear(medicion.velocidad_minima ?? velocidadMinima),
      estabilidad: redondear(velocidadMaxima - velocidadMinima),
    },
    temperatura: {
      media: redondear(medicion.temperatura_media ?? calcularMedia(temperaturas)),
      maxima: redondear(temperaturaMaxima),
      minima: redondear(temperaturaMinima),
    },
    potencia: {
      media: redondear(medicion.potencia_media ?? calcularMedia(potencias)),
      maxima: redondear(potenciaMaxima),
      minima: redondear(potenciaMinima),
    },
    trazas: {
      velocidad: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.velMs,
      })),
      temperatura: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.tempC,
      })),
      potencia: muestras.map((muestra) => ({
        segundo: muestra.segundo,
        valor: muestra.potPct,
      })),
    },
    eventos: eventosApi.map((evento) => ({
      id: evento.id,
      hora: formatearHora(evento.creado_en),
      nivel: evento.tipo === "error" ? "critica" : "info",
      etiqueta: evento.tipo || "info",
      mensaje: evento.mensaje,
    })),
    muestras,
  };
}

function TablaMuestras({ muestras }) {
  return (
    <div className="reg2tablamuestras">
      <table>
        <thead>
          <tr>
            <th>t (s)</th>
            <th>Velocidad (m/s)</th>
            <th>Temperatura (C)</th>
            <th>Potencia (%)</th>
          </tr>
        </thead>
        <tbody>
          {muestras.map((muestra, indice) => (
            <tr key={`${muestra.segundo}-${indice}`}>
              <td>{muestra.segundo}</td>
              <td>{muestra.velMs}</td>
              <td>{muestra.tempC}</td>
              <td>{muestra.potPct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginaRegistro2() {
  const [ensayosApi, setEnsayosApi] = useState([]);
  const [ensayoApiSeleccionadoId, setEnsayoApiSeleccionadoId] = useState(null);
  const [medicionesApi, setMedicionesApi] = useState([]);
  const [conteoMedicionesApi, setConteoMedicionesApi] = useState({});
  const [medicionApiSeleccionadaId, setMedicionApiSeleccionadaId] = useState(null);
  const [medicionApiDetalle, setMedicionApiDetalle] = useState(null);
  const [errorApi, setErrorApi] = useState("");
  const [archivosCargados, setArchivosCargados] = useState(cargarArchivosRegistroGuardados);
  const [archivoSeleccionadoId, setArchivoSeleccionadoId] = useState(null);
  const [grupoArchivoSeleccionadoId, setGrupoArchivoSeleccionadoId] = useState(null);
  const [errorImportacion, setErrorImportacion] = useState("");
  const [importando, setImportando] = useState(false);
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState("api");

  const ensayosImportados = useMemo(
    () => agruparArchivosPorEnsayo(archivosCargados),
    [archivosCargados]
  );
  const apiDisponible = !errorApi;
  const usaApi = apiDisponible && fuenteSeleccionada !== "archivo";
  const hayEnsayosVisibles = (apiDisponible && ensayosApi.length > 0) || ensayosImportados.length > 0;

  const ensayoApiSeleccionado =
    ensayosApi.find((ensayo) => ensayo.id === ensayoApiSeleccionadoId) ||
    ensayosApi[0] ||
    null;
  const medicionApiSeleccionada =
    medicionesApi.find((medicion) => medicion.id === medicionApiSeleccionadaId) ||
    null;
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
  const ensayoArchivoSeleccionado =
    grupoArchivoSeleccionado?.ensayo || archivoSeleccionado?.ensayo || null;
  const medicionSeleccionada = usaApi ? medicionApiDetalle : medicionArchivoSeleccionada;
  const tarjetasResumen = crearTarjetasResumen(medicionSeleccionada);

  const cargarEnsayosApi = useCallback(async ({ mantenerSeleccion = true } = {}) => {
    setErrorApi("");

    try {
      const ensayos = await listarEnsayosApi();
      setEnsayosApi(ensayos);
      setConteoMedicionesApi((actual) => {
        const siguiente = { ...actual };
        ensayos.forEach((ensayo) => {
          if (siguiente[ensayo.id] === undefined) {
            siguiente[ensayo.id] = Number(ensayo.total_mediciones || 0);
          }
        });
        return siguiente;
      });
      setEnsayoApiSeleccionadoId((actual) => {
        if (mantenerSeleccion && ensayos.some((ensayo) => ensayo.id === actual)) {
          return actual;
        }

        return ensayos[0]?.id || null;
      });
    } catch {
      setErrorApi("No se ha podido conectar con MySQL.");
    }
  }, []);

  useEffect(() => {
    try {
      if (archivosCargados.length) {
        sessionStorage.setItem(CLAVE_ARCHIVOS_REGISTRO, JSON.stringify(archivosCargados));
      } else {
        sessionStorage.removeItem(CLAVE_ARCHIVOS_REGISTRO);
      }
    } catch {
      // Si el navegador no permite sessionStorage, Registro sigue funcionando sin persistencia temporal.
    }
  }, [archivosCargados]);

  useEffect(() => {
    function refrescarSiVisible() {
      if (!document.hidden) {
        void cargarEnsayosApi();
      }
    }

    void cargarEnsayosApi({ mantenerSeleccion: false });
    window.addEventListener("focus", refrescarSiVisible);
    window.addEventListener("tunelab:registro-actualizado", refrescarSiVisible);
    document.addEventListener("visibilitychange", refrescarSiVisible);

    return () => {
      window.removeEventListener("focus", refrescarSiVisible);
      window.removeEventListener("tunelab:registro-actualizado", refrescarSiVisible);
      document.removeEventListener("visibilitychange", refrescarSiVisible);
    };
  }, [cargarEnsayosApi]);

  useEffect(() => {
    if (!usaApi || !ensayoApiSeleccionado?.id) {
      setMedicionesApi([]);
      setMedicionApiSeleccionadaId(null);
      setMedicionApiDetalle(null);
      return;
    }

    let cancelado = false;

    async function cargarMediciones() {
      try {
        const mediciones = await listarMedicionesEnsayoApi(ensayoApiSeleccionado.id);

        if (cancelado) return;

        setMedicionesApi(mediciones);
        setConteoMedicionesApi((actual) => ({
          ...actual,
          [ensayoApiSeleccionado.id]: mediciones.length,
        }));
        setMedicionApiSeleccionadaId(null);
        setMedicionApiDetalle(null);
      } catch {
        if (!cancelado) {
          setMedicionesApi([]);
          setMedicionApiSeleccionadaId(null);
          setMedicionApiDetalle(null);
        }
      }
    }

    void cargarMediciones();

    return () => {
      cancelado = true;
    };
  }, [ensayoApiSeleccionado?.id, usaApi]);

  useEffect(() => {
    if (!usaApi || !medicionApiSeleccionada?.id) {
      setMedicionApiDetalle(null);
      return;
    }

    let cancelado = false;

    async function cargarDetalleMedicion() {
      try {
        const [muestras, eventos] = await Promise.all([
          listarMuestrasMedicionApi(medicionApiSeleccionada.id),
          listarEventosMedicionApi(medicionApiSeleccionada.id),
        ]);

        if (!cancelado) {
          setMedicionApiDetalle(
            crearMedicionDesdeApi(medicionApiSeleccionada, muestras, eventos)
          );
        }
      } catch {
        if (!cancelado) {
          setMedicionApiDetalle(crearMedicionDesdeApi(medicionApiSeleccionada));
        }
      }
    }

    void cargarDetalleMedicion();

    return () => {
      cancelado = true;
    };
  }, [medicionApiSeleccionada, usaApi]);

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
        documentos.push(await leerArchivoMedicionTunelab(archivo));
      }

      setArchivosCargados((actuales) => [...documentos, ...actuales]);
      setGrupoArchivoSeleccionadoId(crearClaveEnsayoImportado(documentos[0]?.ensayo));
      setArchivoSeleccionadoId(null);
      setFuenteSeleccionada("archivo");
    } catch (error) {
      setErrorImportacion(error.message || "No se ha podido importar el archivo.");
    } finally {
      setImportando(false);
      evento.target.value = "";
    }
  }

  function limpiarArchivos() {
    setArchivosCargados([]);
    setArchivoSeleccionadoId(null);
    setGrupoArchivoSeleccionadoId(null);
    setErrorImportacion("");
    setFuenteSeleccionada("api");
  }

  async function cargarMedicionApiCompleta(medicion) {
    const [muestras, eventos] = await Promise.all([
      listarMuestrasMedicionApi(medicion.id),
      listarEventosMedicionApi(medicion.id),
    ]);

    return crearMedicionDesdeApi(medicion, muestras, eventos);
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
      if (ensayoApiSeleccionado?.id) {
        setConteoMedicionesApi((actual) => ({
          ...actual,
          [ensayoApiSeleccionado.id]: restantes.length,
        }));
      }
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
        mediciones.map(async (medicion) => {
          const [muestras, eventos] = await Promise.all([
            listarMuestrasMedicionApi(medicion.id),
            listarEventosMedicionApi(medicion.id),
          ]);

          return crearMedicionDesdeApi(medicion, muestras, eventos);
        })
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
      setConteoMedicionesApi((actual) => {
        const siguiente = { ...actual };
        delete siguiente[ensayo.id];
        return siguiente;
      });
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

  return (
    <div className="page page--registro2">
      <section className="reg2navegador reg2navegadorarchivos">
        <div className="reg2panel reg2panelensayos">
          <header className="reg2panelcabecera">
            <h3>Ensayos guardados</h3>
          </header>

          <div className="reg2importador">
            <label className="reg2boton reg2botonsecundario">
              {importando ? "Importando..." : "Cargar archivo"}
              <input
                type="file"
                accept=".json,.tunelab.json,application/json"
                multiple
                onChange={importarArchivos}
                disabled={importando}
              />
            </label>
            {archivosCargados.length ? (
              <button
                type="button"
                className="reg2boton reg2botonsecundario"
                onClick={limpiarArchivos}
              >
                Limpiar archivos
              </button>
            ) : null}
            <small className="reg2importadorayuda">Cargar mediciones descargadas</small>
          </div>

          {errorApi ? (
            <p className="reg2errorlinea">No se ha podido conectar con la base de datos.</p>
          ) : null}

          {errorImportacion ? (
            <article className="reg2evento reg2eventoerror">
              <strong>{errorImportacion}</strong>
            </article>
          ) : null}

          {hayEnsayosVisibles ? (
            <div className="reg2lista reg2listaensayos">
              {ensayosImportados.map((grupo) => {
                const esSeleccionado = !usaApi && grupo.id === grupoArchivoSeleccionado?.id;

                return (
                  <article
                    key={"archivo-" + grupo.id}
                    className={"reg2item reg2itemensayo " + (esSeleccionado ? "reg2itemseleccionado" : "")}
                    onClick={() => seleccionarEnsayoImportado(grupo)}
                  >
                    <span className="reg2itemfecha">Archivo cargado</span>
                    <strong>{grupo.ensayo.nombre}</strong>
                    <span>{grupo.ensayo.objetivo || "Sin objetivo registrado"}</span>
                    <span className="reg2itemcodigo">
                      {grupo.ensayo.codigo} - {grupo.archivos.length} mediciones
                    </span>
                    <div className="reg2itemacciones">
                      <button type="button" className="reg2boton reg2botonsecundario botondescargar" onClick={(evento) => descargarEnsayoImportadoRegistro(evento, grupo)} aria-label="Descargar ensayo" title="Descargar ensayo">
                        <Download size={18} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                      <button type="button" className="reg2boton reg2botonpeligro botonborrar" onClick={(evento) => borrarEnsayoImportadoRegistro(evento, grupo)} aria-label="Borrar ensayo" title="Borrar ensayo">
                        <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}

              {apiDisponible && ensayosApi.map((ensayo) => {
                const esSeleccionado = usaApi && ensayo.id === ensayoApiSeleccionado?.id;
                const totalMediciones = conteoMedicionesApi[ensayo.id] ?? ensayo.total_mediciones ?? 0;

                return (
                  <article
                    key={"api-" + ensayo.id}
                    className={"reg2item reg2itemensayo " + (esSeleccionado ? "reg2itemseleccionado" : "")}
                    onClick={() => seleccionarEnsayoApi(ensayo.id)}
                  >
                    <span className="reg2itemfecha">
                      {formatearFecha(ensayo.creado_en)} - {formatearHora(ensayo.creado_en)}
                    </span>
                    <strong>{ensayo.nombre}</strong>
                    <span>{ensayo.objetivo || "Sin objetivo registrado"}</span>
                    <span className="reg2itemcodigo">
                      {ensayo.codigo} - {totalMediciones} mediciones
                    </span>
                    <div className="reg2itemacciones">
                      <button type="button" className="reg2boton reg2botonsecundario botondescargar" onClick={(evento) => descargarEnsayoApiRegistro(evento, ensayo)} aria-label="Descargar ensayo" title="Descargar ensayo">
                        <Download size={18} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                      <button type="button" className="reg2boton reg2botonpeligro botonborrar" onClick={(evento) => borrarEnsayoApiRegistro(evento, ensayo)} aria-label="Borrar ensayo" title="Borrar ensayo">
                        <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EstadoVacioRegistro2 texto="Todavia no hay ensayos guardados." />
          )}
        </div>

        <div className="reg2panel reg2panelmediciones">
          <header className="reg2panelcabecera">
            <h3>Mediciones del ensayo</h3>
            {usaApi && ensayoApiSeleccionado ? (
              <span className="reg2panelcontador">{medicionesApi.length} mediciones</span>
            ) : null}
            {!usaApi && grupoArchivoSeleccionado ? (
              <span className="reg2panelcontador">{grupoArchivoSeleccionado.archivos.length} mediciones</span>
            ) : null}
          </header>

          {usaApi ? (
            ensayoApiSeleccionado ? (
              <>
                {medicionesApi.length ? (
                  <div className="reg2lista reg2listamediciones">
                    {medicionesApi.map((medicion) => {
                      const estaSeleccionada = medicion.id === medicionApiSeleccionada?.id;

                      return (
                        <article
                          key={medicion.id}
                          className={`reg2item reg2itemmedicion ${estaSeleccionada ? "reg2itemseleccionado" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setMedicionApiSeleccionadaId(medicion.id)}
                          onKeyDown={(evento) => {
                            if (evento.key === "Enter" || evento.key === " ") {
                              setMedicionApiSeleccionadaId(medicion.id);
                            }
                          }}
                        >
                          <strong>{medicion.nombre}</strong>
                          <span>{formatearFecha(medicion.creado_en)} - {formatearHora(medicion.creado_en)}</span>
                          <span>Duracion {formatearTiempoFuncionamiento(medicion.duracion_segundos || 0)}</span>
                          <span>Velocidad media {redondear(medicion.velocidad_media)} m/s</span>
                          <div className="reg2itemacciones" aria-label="Acciones de la medicion">
                            <button
                              type="button"
                              className="reg2boton reg2botonsecundario botondescargar"
                              onClick={(evento) => descargarMedicionApiRegistro(evento, medicion)}
                              aria-label={`Descargar ${medicion.nombre}`}
                            >
                              <Download size={18} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="reg2boton reg2botonpeligro botonborrar"
                              onClick={(evento) => borrarMedicionApiRegistro(evento, medicion)}
                              aria-label={`Borrar ${medicion.nombre}`}
                            >
                              <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EstadoVacioRegistro2 texto="Este ensayo existe, pero aun no tiene mediciones guardadas." />
                )}
              </>
            ) : (
              <EstadoVacioRegistro2 texto="Todavia no hay mediciones guardadas en este ensayo." />
            )
          ) : grupoArchivoSeleccionado ? (
            <>
              <div className="reg2lista reg2listamediciones">
                {grupoArchivoSeleccionado.archivos.map((archivo) => {
                  const estaSeleccionada = archivo.id === archivoSeleccionado?.id;

                  return (
                    <article
                      key={archivo.id}
                      className={`reg2item reg2itemmedicion ${estaSeleccionada ? "reg2itemseleccionado" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setArchivoSeleccionadoId(archivo.id)}
                      onKeyDown={(evento) => {
                        if (evento.key === "Enter" || evento.key === " ") {
                          setArchivoSeleccionadoId(archivo.id);
                        }
                      }}
                    >
                      <strong>{archivo.medicion.nombre}</strong>
                      <span>{archivo.medicion.fecha} - {archivo.medicion.hora}</span>
                      <span>{archivo.nombreArchivo}</span>
                      <span>{archivo.medicion.totalMuestras} muestras</span>
                      <div className="reg2itemacciones" aria-label="Acciones de la medicion importada">
                        <button
                          type="button"
                          className="reg2boton reg2botonsecundario botondescargar"
                          onClick={(evento) => descargarMedicionImportadaRegistro(evento, archivo)}
                          aria-label={`Descargar ${archivo.medicion.nombre}`}
                        >
                          <Download size={18} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="reg2boton reg2botonpeligro botonborrar"
                          onClick={(evento) => borrarMedicionImportadaRegistro(evento, archivo)}
                          aria-label={`Borrar ${archivo.medicion.nombre}`}
                        >
                          <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <EstadoVacioRegistro2 texto="Carga archivos generados desde Control para ver sus mediciones." />
          )}
        </div>
      </section>

      <section className="reg2panel reg2paneldetalle">
        <InformeMedicionComun
          medicion={medicionSeleccionada}
          tarjetas={tarjetasResumen}
          estilos={estilosResumenRegistro2}
          titulo="Informe de medicion"
          subtitulo={medicionSeleccionada ? `${medicionSeleccionada.nombre} - ${medicionSeleccionada.fecha || ""} ${medicionSeleccionada.hora || ""}` : ""}
          onDescargar={medicionSeleccionada ? descargarMedicionRegistro : null}
          onBorrar={medicionSeleccionada ? borrarMedicionRegistro : null}
          nombreEnsayo={(usaApi ? ensayoApiSeleccionado?.nombre : ensayoArchivoSeleccionado?.nombre) || ""}
        />
      </section>
    </div>
  );
}

export default PaginaRegistro2;












