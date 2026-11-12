import { useState } from "react";
import useBorradorSincronizado from "../logicaPantallas/useBorradorSincronizado";
import { obtenerEnsayoActivo } from "../servicios/tunel/estadoTunel";
import { useTunel } from "../logicaPantallas/useTunel";
import {
  asegurarUsuarioApi,
  actualizarEnsayoApi,
  crearEnsayoApi,
  obtenerIdEnsayoApi,
  vincularEnsayoApi,
} from "../servicios/api/registroApi";

const LIMITES_CAMPOS_ENSAYO = {
  nombre: 30,
  objetivo: 40,
  descripcion: 200,
};

const FORMULARIO_VACIO = {
  nombre: "",
  objetivo: "",
  descripcion: "",
};

const CAMPOS_ENSAYO = [
  { nombre: "nombre", etiqueta: "Nombre del ensayo", ejemplo: "Ej. Perfil aerodinamico 1", placeholder: "Nombre del ensayo" },
  { nombre: "objetivo", etiqueta: "Objetivo", ejemplo: "Ej. Medir velocidad a 60% de potencia", placeholder: "Objetivo del ensayo" },
  { nombre: "descripcion", etiqueta: "Descripción", ejemplo: "Condiciones iniciales, montaje, material o incidencias previas", placeholder: "Descripcion", area: true },
];

function CamposEnsayo({ formulario, onChange, edicion = false, disabled = false }) {
  return (
    <div className="ens2formulario">
      {CAMPOS_ENSAYO.map((campo) => {
        const Entrada = campo.area ? "textarea" : "input";
        return (
          <label key={campo.nombre} className={`ens2campo${campo.area ? " ens2campoarea" : ""}`}>
            <span className="ens2campocabecera">
              <span>{campo.etiqueta}</span>
              <small className="ens2campocontador">
                {formulario[campo.nombre].length}/{LIMITES_CAMPOS_ENSAYO[campo.nombre]}
              </small>
            </span>
            <Entrada
              type={campo.area ? undefined : "text"}
              name={campo.nombre}
              value={formulario[campo.nombre]}
              placeholder={edicion ? campo.placeholder : campo.ejemplo}
              onChange={onChange}
              maxLength={LIMITES_CAMPOS_ENSAYO[campo.nombre]}
              disabled={disabled}
            />
          </label>
        );
      })}
    </div>
  );
}

function crearFormularioDesdeEnsayo(ensayo) {
  if (!ensayo) {
    return { ...FORMULARIO_VACIO };
  }

  return {
    nombre: ensayo.nombre || "",
    objetivo: ensayo.objetivo || "",
    descripcion: ensayo.descripcion || "",
  };
}

function formularioCompleto(formulario) {
  return formulario.nombre.trim().length > 0 && formulario.objetivo.trim().length > 0;
}

function FormularioCrearEnsayo({ formulario, onChange, onSubmit, guardando, bloqueado, error }) {
  return (
    <form className="ens2panel ens2panelalta" onSubmit={onSubmit}>
      <header className="ens2panelcabecera ens2formulariocabecera">
        <h3>Crear nuevo ensayo</h3>
        <p>Define los datos del ensayo antes de empezar a medir.</p>
      </header>
      <CamposEnsayo formulario={formulario} onChange={onChange} />

      <div className="ens2accionescrear">
        <button
          type="submit"
          className="ens2boton ens2botonprimario"
          disabled={bloqueado || guardando || !formularioCompleto(formulario)}
        >
          {guardando ? "Creando ensayo..." : "Crear ensayo"}
        </button>
        {error ? <span className="ens2errorlinea">{error}</span> : null}
      </div>
    </form>
  );
}

function PaginaEnsayos({ usuarioActual, onAbrirControl, onCrearEnsayo }) {
  const { estadoTunel, accionesTunel } = useTunel();
  const ensayoActivo = obtenerEnsayoActivo(estadoTunel);
  const ensayos = estadoTunel.ensayos || [];
  const edicionBloqueada = Boolean(estadoTunel.medActiva || estadoTunel.programa?.activo);

  const [busquedaEnsayos, setBusquedaEnsayos] = useState("");
  const [formCrear, setFormCrear] = useState({ ...FORMULARIO_VACIO });
  const [formEditar, setFormEditar] = useBorradorSincronizado(
    ensayoActivo?.id,
    crearFormularioDesdeEnsayo(ensayoActivo)
  );
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [errorEditar, setErrorEditar] = useState("");
  const ensayosFiltrados = ensayos.filter((ensayo) =>
    [ensayo.nombre, ensayo.objetivo, ensayo.fecha, ensayo.hora]
      .some((valor) => String(valor || "").toLowerCase().includes(busquedaEnsayos.trim().toLowerCase()))
  );

  function cambiarFormularioCrear(evento) {
    cambiarCampo(evento, setFormCrear);
  }

  function cambiarFormularioEditar(evento) {
    cambiarCampo(evento, setFormEditar);
  }

  function cambiarCampo(evento, setFormulario) {
    const nombreCampo = evento.target.name;
    const valorCampo = evento.target.value;
    const limite = LIMITES_CAMPOS_ENSAYO[nombreCampo];

    setFormulario((actual) => ({
      ...actual,
      [nombreCampo]: limite ? valorCampo.slice(0, limite) : valorCampo,
    }));
  }

  function abrirControl() {
    onAbrirControl?.();
  }

  async function crearNuevoEnsayo(evento) {
    evento.preventDefault();

    if (edicionBloqueada || guardandoCrear || !formularioCompleto(formCrear)) {
      return;
    }

    setGuardandoCrear(true);
    setErrorCrear("");

    try {
      if (!accionesTunel.crearEnsayo) {
        return;
      }

      const usuarioApi = await asegurarUsuarioApi(usuarioActual);
      const ensayoApi = await crearEnsayoApi({
        usuarioId: usuarioApi.id,
        codigo: null,
        nombre: formCrear.nombre.trim(),
        objetivo: formCrear.objetivo.trim(),
        descripcion: formCrear.descripcion.trim(),
      });

      const ensayoPreparado = await accionesTunel.crearEnsayo({
        codigo: ensayoApi.codigo,
        nombre: ensayoApi.nombre,
        objetivo: ensayoApi.objetivo || "",
        descripcion: ensayoApi.descripcion || "",
      });

      vincularEnsayoApi(ensayoPreparado.codigo, ensayoApi);
      setFormCrear({ ...FORMULARIO_VACIO });
      onCrearEnsayo?.();
    } catch (error) {
      console.warn("No se ha podido guardar la ficha en MySQL.", error);
      setErrorCrear(error.detalle || "No se ha podido crear el ensayo. Comprueba que el backend y MySQL estan iniciados.");
    } finally {
      setGuardandoCrear(false);
    }
  }

  async function guardarCambiosEnsayo(evento) {
    evento.preventDefault();

    if (!ensayoActivo || guardandoEditar || !formularioCompleto(formEditar)) {
      return;
    }

    if (edicionBloqueada) {
      setErrorEditar("Finaliza la medición o el programa por etapas antes de editar el ensayo.");
      return;
    }

    setGuardandoEditar(true);
    setErrorEditar("");

    try {
      if (!accionesTunel.actualizarEnsayo) {
        return;
      }

      const idEnsayoApi = obtenerIdEnsayoApi(ensayoActivo.codigo) || ensayoActivo.id;
      const datosEditados = {
        nombre: formEditar.nombre.trim(),
        objetivo: formEditar.objetivo.trim(),
        descripcion: formEditar.descripcion.trim(),
      };

      const ensayoApi = await actualizarEnsayoApi(idEnsayoApi, datosEditados);

      accionesTunel.actualizarEnsayo(ensayoActivo.id, {
        nombre: ensayoApi.nombre,
        objetivo: ensayoApi.objetivo || "",
        descripcion: ensayoApi.descripcion || "",
      });
    } catch (error) {
      console.warn("No se ha podido editar el ensayo.", error);
      setErrorEditar("No se han podido guardar los cambios del ensayo.");
    } finally {
      setGuardandoEditar(false);
    }
  }

  function activarEnsayo(ensayo) {
    if (edicionBloqueada) return;
    accionesTunel.activarEnsayo?.(ensayo.id);
  }

  return (
    <div className="page page--ensayo2">
      <section className="ens2gridprincipal">
        <FormularioCrearEnsayo
          formulario={formCrear}
          onChange={cambiarFormularioCrear}
          onSubmit={crearNuevoEnsayo}
          guardando={guardandoCrear}
          bloqueado={edicionBloqueada}
          error={errorCrear}
        />

        <section className="ens2panel ens2panelfichaunica">
          <header className="ens2panelcabecera ens2formulariocabecera">
            <h3>Editar ensayo activo</h3>
            <p>Revisa y actualiza la información del ensayo seleccionado.</p>
          </header>

          {ensayoActivo ? (
            <div className="ens2fichaunica">
              <div className="ens2resumenficha">
                <div>
                  <span>Fecha</span>
                  <strong>{ensayoActivo.fecha} - {ensayoActivo.hora}</strong>
                </div>
                <div>
                  <span>Mediciones</span>
                  <strong>{ensayoActivo.mediciones?.length || 0}</strong>
                </div>
              </div>

              <form className="ens2editarform" onSubmit={guardarCambiosEnsayo}>
                {edicionBloqueada ? <p className="ens2error">Finaliza la medición o el programa por etapas antes de editar o cambiar el ensayo.</p> : null}
                {!edicionBloqueada && errorEditar ? <p className="ens2error">{errorEditar}</p> : null}
                <CamposEnsayo
                  formulario={formEditar}
                  onChange={cambiarFormularioEditar}
                  edicion
                  disabled={edicionBloqueada}
                />

                <div className="ens2accionesficha">
                  <button
                    type="submit"
                    className="ens2boton ens2botonprimario"
                    disabled={edicionBloqueada || guardandoEditar || !formularioCompleto(formEditar)}
                  >
                    {guardandoEditar ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button type="button" className="ens2boton ens2botonsecundario" onClick={abrirControl}>
                    Ir a control
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <article className="ens2vacio">
              <p>Crea un ensayo o selecciona uno de la lista para editarlo.</p>
            </article>
          )}
        </section>
      </section>

      <section className="ens2panel ens2panelhistorial ens2historialancho">
        <header className="ens2panelcabecera ens2historialcabecera">
          <div className="ens2historialtitulo">
            <h3>Ensayos creados</h3>
            <p>Selecciona uno para editarlo o abrirlo en Control.</p>
          </div>
          <input
            className="ens2busqueda"
            type="search"
            aria-label="Buscar ensayos creados"
            value={busquedaEnsayos}
            onChange={(evento) => setBusquedaEnsayos(evento.target.value)}
            placeholder="Buscar ensayos..."
          />
          <strong className="ens2contadorlista">
            {busquedaEnsayos.trim() ? `${ensayosFiltrados.length} de ${ensayos.length}` : `${ensayos.length} total`}
          </strong>
        </header>

        {ensayos.length ? (
          ensayosFiltrados.length ? (
            <div className="ens2tablaenvoltorio">
              <table className="ens2tablaensayos">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Objetivo</th>
                    <th scope="col">Fecha de creación</th>
                    <th scope="col">Mediciones</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ensayosFiltrados.map((ensayo) => {
                    const activo = ensayoActivo?.id === ensayo.id;
                    return (
                      <tr className={activo ? "ens2filaseleccionada" : ""} key={ensayo.id}>
                        <td className="ens2tablanombre">{ensayo.nombre}</td>
                        <td className="ens2tablaobjetivo">{ensayo.objetivo || "—"}</td>
                        <td>{ensayo.fecha}{ensayo.hora ? ` · ${ensayo.hora}` : ""}</td>
                        <td className="ens2tablamediciones">{ensayo.mediciones?.length || 0}</td>
                        <td>
                          <div className="ens2tablaacciones">
                            <button
                              type="button"
                              className="ens2boton ens2botonsecundario"
                              onClick={() => activarEnsayo(ensayo)}
                              disabled={activo || edicionBloqueada}
                            >
                              {activo ? "Seleccionado" : "Seleccionar"}
                            </button>
                            <button
                              type="button"
                              className="ens2boton ens2botonprimario"
                              disabled={edicionBloqueada && !activo}
                              onClick={() => {
                                activarEnsayo(ensayo);
                                abrirControl();
                              }}
                            >
                              Ir a control
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <article className="ens2vacio ens2busquedavacia">
              <p>No hay ensayos que coincidan con «{busquedaEnsayos}».</p>
            </article>
          )
        ) : (
          <article className="ens2vacio">
            <p>Todavia no hay ensayos creados.</p>
          </article>
        )}
      </section>
    </div>
  );
}

export default PaginaEnsayos;







