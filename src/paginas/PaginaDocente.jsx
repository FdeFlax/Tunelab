import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InformeMedicionComun } from "../components/mediciones/InformeMedicion";
import {
  borrarEnsayoDocenteApi,
  borrarMedicionDocenteApi,
  listarEnsayosDocenteApi,
  listarEventosDocenteApi,
  listarMedicionesDocenteApi,
  cargarMedicionDocenteCompleta,
} from "../servicios/api/registroApi";
import { desconectarTunelDocenteApi, verConexionTunelApi, escucharEventosTunel } from "../servicios/api/controlApi";
import { descargarArchivoMed } from "../servicios/archivos/medicionArchivo";
import { useCatalogoEnsayos, useDetalleMedicion } from "../logicaPantallas/useEnsayos";
import { formatearFecha, formatearHora, formatearFechaHora } from "../servicios/formato";

function normalizarTexto(texto) {
  return String(texto || "").toLowerCase().trim();
}

function textoEnsayo(ensayo, medicionesPorEnsayo) {
  const medicionesEnsayo = medicionesPorEnsayo[ensayo.id] || [];

  return normalizarTexto(
    [
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

function EstadoVacioDocente({ texto }) {
  return (
    <article className="docvacio">
      <p>{texto}</p>
    </article>
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
        titulo="Informe de medición"
        onCerrar={onCerrar}
        onDescargar={detalle ? () => onDescargar?.(medicion, detalle) : null}
        onBorrar={() => onBorrar?.(medicion)}
        nombreEnsayo={nombreEnsayo}
      />
    </section>
  );
}

function PaginaDocente() {
  const {
    ensayos, ensayo: ensayoSeleccionado, setEnsayoId: setEnsayoSeleccionadoId,
    mediciones, porEnsayo: medicionesPorEnsayo, cargando, error, recargar: cargarEnsayos,
    medicion: medicionVista, setMedicionId,
  } = useCatalogoEnsayos({ listarEnsayos: listarEnsayosDocenteApi, listarMediciones: listarMedicionesDocenteApi,
    precargar: true, mensajeError: "No se ha podido cargar el registro docente." });
  const ensayoSeleccionadoId = ensayoSeleccionado?.id;
  const [busqueda, setBusqueda] = useState("");
  const [aviso, setAviso] = useState("");
  const [conexionTunel, setConexionTunel] = useState(null);
  const { medicionApiDetalle: detalleMedicion, cargandoDetalle, errorDetalle } =
    useDetalleMedicion(medicionVista, true, cargarMedicionDocenteCompleta);
  const [historial, setHistorial] = useState([]);

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
    let vigente = true;
    const leerConexion = () => verConexionTunelApi().then(
      datos => { if (vigente) setConexionTunel(datos); },
      () => { if (vigente) setConexionTunel(null); }
    );
    void leerConexion();
    listarEventosDocenteApi().then(
      datos => { if (vigente) setHistorial(datos); },
      () => { if (vigente) setHistorial([]); }
    );
    const dejarDeEscuchar = escucharEventosTunel(leerConexion);
    return () => { vigente = false; dejarDeEscuchar(); };
  }, []);

  const ensayosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return ensayos.filter((ensayo) => {
      return !texto || textoEnsayo(ensayo, medicionesPorEnsayo).includes(texto);
    });
  }, [busqueda, ensayos, medicionesPorEnsayo]);

  const medicionesFiltradas = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    if (!texto || (ensayoSeleccionado && textoEnsayo(ensayoSeleccionado, medicionesPorEnsayo).includes(texto))) {
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

  function abrirMedicion(medicion) { setMedicionId(medicion.id); }
  function cerrarVistaMedicion() { setMedicionId(null); }

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
          </div>
          <div className="doclista">
            <div className="lista-scroll-contenido">
              {cargando ? <EstadoVacioDocente texto="Cargando ensayos..." /> : null}
              {error ? <EstadoVacioDocente texto={error} /> : null}
              {!cargando && !error && !ensayosFiltrados.length ? (
                <EstadoVacioDocente
                  texto={
                    ensayos.length
                      ? "No hay ensayos que coincidan con la busqueda."
                      : "No hay ensayos registrados todavia."
                  }
                />
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
                  <strong>{ensayo.nombre}</strong>
                  <span>
                    {formatearFecha(ensayo.creado_en)} · {formatearHora(ensayo.creado_en)}
                  </span>
                  <span>
                    {ensayo.usuario?.nombre || "Usuario sin nombre"} · {" "}
                    {ensayo.usuario?.identificador_uacloud || "sin identificador"}
                  </span>
                  <span>
                    {ensayo.total_mediciones || 0} {Number(ensayo.total_mediciones) === 1 ? "medición" : "mediciones"}
                  </span>
                </button>
              ))}
            </div>
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
          ) : (
            <EstadoVacioDocente
              texto={
                cargando
                  ? "Cargando detalle del ensayo..."
                  : ensayos.length
                    ? "Selecciona un ensayo para revisar sus mediciones."
                    : "Cuando haya ensayos registrados, aqui se mostraran sus detalles y mediciones."
              }
            />
          )}
        </article>
      </section>

      {errorDetalle && medicionVista ? <p role="alert">{errorDetalle}</p> : null}
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
