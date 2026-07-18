import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InformeMedicionComun } from "../components/ResumenMedicion";
import {
  borrarEnsayoDocenteApi,
  borrarMedicionDocenteApi,
  listarEnsayosDocenteApi,
  listarEventosDocenteApi,
  listarEventosMedicionDocenteApi,
  listarMedicionesDocenteApi,
  listarMuestrasMedicionDocenteApi,
} from "../servicios/api/ensayosApi";
import { desconectarTunelDocenteApi, verConexionTunelApi } from "../servicios/api/tunelConexionApi";
import { escucharEventosTunel } from "../servicios/api/tunelEventosApi";
import { descargarArchivoMed } from "../servicios/archivos/medicionArchivo";
import { calcularMagnitudesDerivadas } from "../servicios/tunel/fichaTunel";

function formatearFechaHora(fecha) {
  if (!fecha) {
    return "--";
  }

  return new Date(fecha).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizarTexto(texto) {
  return String(texto || "").toLowerCase().trim();
}

function TarjetaDatoDocente({ etiqueta, valor, apoyo }) {
  return (
    <article className="docdato">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
      {apoyo ? <small>{apoyo}</small> : null}
    </article>
  );
}

function EstadoVacioDocente({ texto }) {
  return (
    <article className="docvacio">
      <p>{texto}</p>
    </article>
  );
}

const estilosResumenDocente = {
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
  prefijoGradiente: "docente",
};

function redondear(valor, decimales = 1) {
  return Number((Number(valor) || 0).toFixed(decimales));
}

function calcularMedia(valores) {
  if (!valores.length) {
    return 0;
  }

  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function crearDetalleMedicion(medicion, muestrasApi = [], eventosApi = []) {
  const muestras = muestrasApi.map((muestra, indice) => {
    const velMs = redondear(muestra.velocidad_ms);
    const magnitudes = calcularMagnitudesDerivadas({ velocidadMs: velMs });

    return {
      segundo: indice + 1,
      velMs,
      tempC: redondear(muestra.temperatura_c),
      potPct: redondear(muestra.potencia_porcentaje),
      caudalM3s: muestra.caudal_m3s == null ? magnitudes.caudalM3s : redondear(muestra.caudal_m3s),
      presionPa: muestra.presion_pa == null ? magnitudes.presionDinamicaPa : redondear(muestra.presion_pa),
    };
  });
  const velocidades = muestras.map((muestra) => muestra.velMs);
  const temperaturas = muestras.map((muestra) => muestra.tempC);
  const potencias = muestras.map((muestra) => muestra.potPct);
  const caudales = muestras.map((muestra) => muestra.caudalM3s).filter((valor) => Number.isFinite(Number(valor)));
  const presiones = muestras.map((muestra) => muestra.presionPa).filter((valor) => Number.isFinite(Number(valor)));
  const velMax = velocidades.length ? Math.max(...velocidades) : 0;
  const velMin = velocidades.length ? Math.min(...velocidades) : 0;
  const tempMax = temperaturas.length ? Math.max(...temperaturas) : 0;
  const tempMin = temperaturas.length ? Math.min(...temperaturas) : 0;
  const potMax = potencias.length ? Math.max(...potencias) : 0;
  const potMin = potencias.length ? Math.min(...potencias) : 0;

  return {
    id: medicion.id,
    nombre: medicion.nombre,
    fecha: formatearFechaHora(medicion.creado_en),
    durSeg: medicion.duracion_segundos || muestras.length,
    totalMuestras: muestras.length,
    objVelMs: redondear(medicion.velocidad_objetivo),
    objPotPct: redondear(medicion.potencia_objetivo),
    velocidad: {
      media: redondear(medicion.velocidad_media ?? calcularMedia(velocidades)),
      maxima: redondear(medicion.velocidad_maxima ?? velMax),
      minima: redondear(medicion.velocidad_minima ?? velMin),
      estabilidad: redondear(velMax - velMin),
    },
    temperatura: {
      media: redondear(medicion.temperatura_media ?? calcularMedia(temperaturas)),
      maxima: redondear(tempMax),
      minima: redondear(tempMin),
    },
    potencia: {
      media: redondear(medicion.potencia_media ?? calcularMedia(potencias)),
      maxima: redondear(potMax),
      minima: redondear(potMin),
    },
    tecnicos: {
      caudalMedioM3s: caudales.length ? redondear(calcularMedia(caudales)) : null,
      presionMediaPa: presiones.length ? redondear(calcularMedia(presiones)) : null,
    },
    trazas: {
      velocidad: muestras.map((muestra) => ({ segundo: muestra.segundo, valor: muestra.velMs })),
      caudal: muestras.map((muestra) => ({ segundo: muestra.segundo, valor: muestra.caudalM3s })),
      temperatura: muestras.map((muestra) => ({ segundo: muestra.segundo, valor: muestra.tempC })),
      potencia: muestras.map((muestra) => ({ segundo: muestra.segundo, valor: muestra.potPct })),
      presion: muestras.map((muestra) => ({ segundo: muestra.segundo, valor: muestra.presionPa })),
    },
    eventos: eventosApi.map((evento) => ({
      id: evento.id,
      tipo: evento.tipo || "info",
      mensaje: evento.mensaje,
      hora: formatearFechaHora(evento.creado_en),
    })),
    muestras,
  };
}

function tarjetasDetalleMedicion(detalle) {
  return [
    { etiqueta: "Duracion", valor: `${detalle.durSeg} s`, apoyo: `${detalle.totalMuestras} muestras` },
    { etiqueta: "Velocidad media", valor: `${detalle.velocidad.media} m/s`, apoyo: `Max ${detalle.velocidad.maxima} m/s` },
    { etiqueta: "Estabilidad", valor: `${detalle.velocidad.estabilidad} m/s`, apoyo: "Diferencia max-min" },
    { etiqueta: "Caudal medio", valor: `${detalle.tecnicos?.caudalMedioM3s ?? 0} m³/s`, apoyo: "Derivado de velocidad" },
    { etiqueta: "Consigna media", valor: `${detalle.potencia.media}%`, apoyo: `Objetivo ${detalle.objPotPct}%` },
    { etiqueta: "Incidencias", valor: `${detalle.eventos.length}`, apoyo: detalle.eventos.length ? "Eventos registrados" : "Sin incidencias" },
  ];
}

function TablaMuestrasDocente({ muestras }) {
  return (
    <div className="reg2tablamuestras">
      <table>
        <thead>
          <tr>
            <th>t (s)</th>
            <th>Velocidad (m/s)</th>
            <th>Caudal (m³/s)</th>
            <th>Consigna (%)</th>
          </tr>
        </thead>
        <tbody>
          {muestras.map((muestra) => (
            <tr key={muestra.segundo}>
              <td>{muestra.segundo}</td>
              <td>{muestra.velMs}</td>
              <td>{muestra.caudalM3s ?? "-"}</td>
              <td>{muestra.potPct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function HistorialActividadDocente({ eventos }) {
  return (
    <section className="dochistorial">
      <div className="dochistorialcabecera">
        <h3>Historial de actividad</h3>
      </div>

      <div className="dochistoriallista">
        {eventos.length ? (
          eventos.map((evento) => (
            <article className="dochistorialevento" key={evento.id}>
              <span>{formatearFechaHora(evento.creado_en)}</span>
              <p>{evento.mensaje}</p>
            </article>
          ))
        ) : (
          <EstadoVacioDocente texto="Todavia no hay eventos registrados." />
        )}
      </div>
    </section>
  );
}


function InformeMedicionDocente({ medicion, detalle, cargando, onCerrar, onDescargar, onBorrar, nombreEnsayo }) {
  if (!medicion) {
    return null;
  }

  return (
    <section className="docinforme">
      <InformeMedicionComun
        cargando={cargando}
        medicion={detalle}
        tarjetas={detalle ? tarjetasDetalleMedicion(detalle) : []}
        estilos={estilosResumenDocente}
        titulo="Informe de medicion"
        subtitulo={`${medicion.nombre} - ${formatearFechaHora(medicion.creado_en)}`}
        onCerrar={onCerrar}
        onDescargar={detalle ? () => onDescargar?.(medicion, detalle) : null}
        onBorrar={() => onBorrar?.(medicion)}
        nombreEnsayo={nombreEnsayo}
      />
    </section>
  );
}

function PaginaDocente() {
  const [ensayos, setEnsayos] = useState([]);
  const [ensayoSeleccionadoId, setEnsayoSeleccionadoId] = useState(null);
  const [mediciones, setMediciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [medicionesPorEnsayo, setMedicionesPorEnsayo] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [conexionTunel, setConexionTunel] = useState(null);
  const [medicionVista, setMedicionVista] = useState(null);
  const [detalleMedicion, setDetalleMedicion] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [historial, setHistorial] = useState([]);

  async function cargarEnsayos() {
    setCargando(true);
    setError("");

    try {
      const respuesta = await listarEnsayosDocenteApi();
      setEnsayos(respuesta);
      cargarTodasLasMediciones(respuesta);
      setEnsayoSeleccionadoId((actual) => {
        const sigueExistiendo = respuesta.some((ensayo) => ensayo.id === actual);
        return sigueExistiendo ? actual : respuesta[0]?.id || null;
      });
    } catch {
      setError("No se ha podido cargar el registro docente.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarTodasLasMediciones(listaEnsayos) {
    const pares = await Promise.all(
      listaEnsayos.map(async (ensayo) => {
        try {
          const lista = await listarMedicionesDocenteApi(ensayo.id);
          return [ensayo.id, lista];
        } catch {
          return [ensayo.id, []];
        }
      })
    );

    setMedicionesPorEnsayo(Object.fromEntries(pares));
  }

  async function cargarMediciones(ensayoId) {
    if (!ensayoId) {
      setMediciones([]);
      return;
    }

    try {
      const respuesta = await listarMedicionesDocenteApi(ensayoId);
      setMediciones(respuesta);
    } catch {
      setMediciones([]);
    }
  }

  async function cargarConexionTunel() {
    try {
      const respuesta = await verConexionTunelApi();
      setConexionTunel(respuesta);
    } catch {
      setConexionTunel(null);
    }
  }

  async function cargarHistorial() {
    try {
      const respuesta = await listarEventosDocenteApi();
      setHistorial(respuesta);
    } catch {
      setHistorial([]);
    }
  }

  async function desconectarUsuarioTunel() {
    try {
      await desconectarTunelDocenteApi();
      await cargarConexionTunel();
      await cargarHistorial();
    } catch {
      setAviso("No se ha podido desconectar al usuario");
    }
  }

  useEffect(() => {
    void cargarEnsayos();
    void cargarConexionTunel();
    void cargarHistorial();

    return escucharEventosTunel(() => {
      void cargarConexionTunel();
    });
  }, []);

  function textoEnsayo(ensayo) {
    const medicionesEnsayo = medicionesPorEnsayo[ensayo.id] || [];

    return normalizarTexto(
      [
        ensayo.codigo,
        ensayo.nombre,
        ensayo.objetivo,
        ensayo.descripcion,
        ensayo.estado,
        ensayo.usuario?.nombre,
        ensayo.usuario?.email,
        ensayo.usuario?.identificador_uacloud,
        ...medicionesEnsayo.map((medicion) =>
          [medicion.nombre, medicion.estado, medicion.creado_en].join(" ")
        ),
      ].join(" ")
    );
  }

  const ensayosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return ensayos.filter((ensayo) => {
      return !texto || textoEnsayo(ensayo).includes(texto);
    });
  }, [busqueda, ensayos, medicionesPorEnsayo]);

  const ensayoSeleccionado = useMemo(
    () => ensayos.find((ensayo) => ensayo.id === ensayoSeleccionadoId) || null,
    [ensayoSeleccionadoId, ensayos]
  );

  useEffect(() => {
    cerrarVistaMedicion();
    void cargarMediciones(ensayoSeleccionado?.id);
  }, [ensayoSeleccionado?.id]);


  const medicionesFiltradas = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    if (!texto || (ensayoSeleccionado && textoEnsayo(ensayoSeleccionado).includes(texto))) {
      return mediciones;
    }

    return mediciones.filter((medicion) =>
      normalizarTexto([
        medicion.nombre,
        medicion.estado,
        medicion.creado_en,
      ].join(" ")).includes(texto)
    );
  }, [busqueda, mediciones, ensayoSeleccionado, medicionesPorEnsayo]);

  async function abrirMedicion(medicion) {
    setMedicionVista(medicion);
    setDetalleMedicion(null);
    setCargandoDetalle(true);

    try {
      const [muestras, eventos] = await Promise.all([
        listarMuestrasMedicionDocenteApi(medicion.id),
        listarEventosMedicionDocenteApi(medicion.id),
      ]);

      setDetalleMedicion(crearDetalleMedicion(medicion, muestras, eventos));
    } catch {
      setDetalleMedicion(crearDetalleMedicion(medicion));
    } finally {
      setCargandoDetalle(false);
    }
  }

  function cerrarVistaMedicion() {
    setMedicionVista(null);
    setDetalleMedicion(null);
    setCargandoDetalle(false);
  }

  function descargarMedicionDocente(medicion, detalle) {
    if (!ensayoSeleccionado || !detalle) return;

    descargarArchivoMed({
      ensayo: ensayoSeleccionado,
      medicion: detalle,
      fuenteTunel: "mysql",
    });
  }
  async function borrarEnsayo(ensayo) {
    const confirmado = window.confirm(
      `Vas a borrar el ensayo "${ensayo.nombre}" y todas sus mediciones. Esta accion no se puede deshacer.`
    );

    if (!confirmado) {
      return;
    }

    try {
      await borrarEnsayoDocenteApi(ensayo.id);
      setAviso("Ensayo borrado");
      await cargarEnsayos();
      await cargarHistorial();
    } catch {
      setAviso("No se ha podido borrar el ensayo");
    }
  }

  async function borrarMedicion(medicion) {
    const confirmado = window.confirm(
      `Vas a borrar la medicion "${medicion.nombre}". Esta accion no se puede deshacer.`
    );

    if (!confirmado) {
      return;
    }

    try {
      await borrarMedicionDocenteApi(medicion.id);
      if (medicionVista?.id === medicion.id) {
        cerrarVistaMedicion();
      }
      setAviso("Medicion borrada");
      await cargarMediciones(ensayoSeleccionado?.id);
      await cargarEnsayos();
      await cargarHistorial();
    } catch {
      setAviso("No se ha podido borrar la medicion");
    }
  }

  return (
    <>
      <section className="page page--docente">
      <section className={`docusotunel ${conexionTunel?.usuario ? "docusotunelactivo" : ""}`}>
        <div>
          <span>Uso actual del tunel</span>
          <h3>{conexionTunel?.usuario?.nombre || "Tunel libre"}</h3>
        </div>

        <div className="docusotunelderecha">
          <div className="docusotuneldatos">
            <strong>{conexionTunel?.usuario?.identificador_uacloud || "--"}</strong>
            <span>{conexionTunel?.usuario?.email || "sin correo"}</span>
          </div>
          {conexionTunel?.usuario ? (
            <button
              className="docbtn docdesconectar"
              onClick={desconectarUsuarioTunel}
              type="button"
            >
              Desconectar
            </button>
          ) : null}
        </div>
      </section>

      <section className="docbuscadorarriba">
        <label className="docbuscarcentral">
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar usuarios, ensayos o mediciones"
            aria-label="Buscar usuarios, ensayos o mediciones"
          />
        </label>
      </section>

      {aviso ? <p className="docaviso">{aviso}</p> : null}

      <section className="docgrid">
        <article className="docpanel">
          <div className="docpanelcabecera">
            <div>
              <h3>Ensayos registrados</h3>
            </div>
            <strong>{ensayosFiltrados.length} </strong>
          </div>
<div className="doclista">
            {cargando ? <EstadoVacioDocente texto="Cargando ensayos..." /> : null}
            {error ? <EstadoVacioDocente texto={error} /> : null}
            {!cargando && !error && !ensayosFiltrados.length ? (
              <EstadoVacioDocente texto="No hay ensayos que coincidan con la busqueda." />
            ) : null}

            {ensayosFiltrados.map((ensayo) => (
              <button
                key={ensayo.id}
                className={`docitem ${
                  ensayo.id === ensayoSeleccionadoId ? "docitemactivo" : ""
                }`}
                onClick={() => setEnsayoSeleccionadoId(ensayo.id)}
                type="button"
              >
                <span>{formatearFechaHora(ensayo.creado_en)}</span>
                <strong>{ensayo.nombre}</strong>
                <small>
                  {ensayo.usuario?.nombre || "Usuario sin nombre"} - {" "}
                  {ensayo.usuario?.identificador_uacloud || "sin identificador"}
                </small>
                <em>
                  {ensayo.codigo} - {ensayo.total_mediciones || 0} mediciones
                </em>
              </button>
            ))}
          </div>
        </article>

        <article className="docpanel docpaneldetalle">
          {ensayoSeleccionado ? (
            <>
              <div className="docpanelcabecera">
                <div>
                  <h3>Detalles del ensayo</h3>
                </div>
                <div className="docacciones">
                  <button
                    className="docbtn docbtnpeligro botonborrar"
                    onClick={() => borrarEnsayo(ensayoSeleccionado)}
                    type="button"
                    aria-label="Borrar ensayo"
                    title="Borrar ensayo"
                  >
                    <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="docdetalletablas">
                <table className="docdetalletabla">
                  <caption>Datos del alumno</caption>
                  <tbody>
                    <tr>
                      <th scope="row">Alumno</th>
                      <td>
                        {ensayoSeleccionado.usuario?.nombre || "--"}
                        <small>{ensayoSeleccionado.usuario?.identificador_uacloud || "--"}</small>
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Correo</th>
                      <td>{ensayoSeleccionado.usuario?.email || "--"}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="docdetalletabla">
                  <caption>Datos del ensayo</caption>
                  <tbody>
                    <tr>
                      <th scope="row">Codigo</th>
                      <td>{ensayoSeleccionado.codigo}</td>
                    </tr>
                    <tr>
                      <th scope="row">Nombre del ensayo</th>
                      <td>{ensayoSeleccionado.nombre}</td>
                    </tr>
                    <tr>
                      <th scope="row">Creado</th>
                      <td>{formatearFechaHora(ensayoSeleccionado.creado_en)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Objetivo</th>
                      <td>{ensayoSeleccionado.objetivo || "Sin objetivo definido."}</td>
                    </tr>
                    <tr>
                      <th scope="row">Descripcion</th>
                      <td>{ensayoSeleccionado.descripcion || "Sin descripcion registrada."}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="docmediciones">
                <div className="docpanelcabecera docpanelcabeceracompacta docmedicionescabecera">
                  <div>
                    <h3>Mediciones del ensayo</h3>
                  </div>
                </div>

                <div className="docmedicioneslista">
                  {medicionesFiltradas.length ? (
                    medicionesFiltradas.map((medicion) => (
                      <article className="docmedicion" key={medicion.id}>
                        <div>
                          <strong>{medicion.nombre}</strong>
                          <span>{formatearFechaHora(medicion.creado_en)}</span>
                        </div>
                        <div>
                          <button
                            className="docbtn"
                            onClick={() => abrirMedicion(medicion)}
                            type="button"
                          >
                            Ver
                          </button>
                          <button
                            className="docbtn docbtnpeligro botonborrar"
                            onClick={() => borrarMedicion(medicion)}
                            type="button"
                            aria-label="Borrar medicion"
                            title="Borrar medicion"
                          >
                            <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <EstadoVacioDocente texto={mediciones.length ? "No hay mediciones que coincidan con la busqueda." : "Este ensayo todavia no tiene mediciones."} />
                  )}
                </div>
              </div>
            </>
          ) : (            <EstadoVacioDocente texto="Selecciona un ensayo para revisar sus mediciones." />
          )}
        </article>
      </section>

      <InformeMedicionDocente
        cargando={cargandoDetalle}
        detalle={detalleMedicion}
        medicion={medicionVista}
        onCerrar={cerrarVistaMedicion}
        onDescargar={descargarMedicionDocente}
        onBorrar={borrarMedicion}
        nombreEnsayo={ensayoSeleccionado?.nombre || ""}
      />

      <HistorialActividadDocente eventos={historial} />
      </section>
    </>
  );
}

export default PaginaDocente;

































