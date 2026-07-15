import { useEffect, useState } from "react";
import { obtenerEnsayoActivo } from "../servicios/tunel/estadoTunel";
import { useTunel } from "../servicios/tunel/useTunel";
import {
  asegurarUsuarioApi,
  actualizarEnsayoApi,
  crearEnsayoApi,
  obtenerIdEnsayoApi,
  vincularEnsayoApi,
} from "../servicios/api/ensayosApi";

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

function CampoEnsayo2({ etiqueta, nombre, valor, placeholder, onChange, area = false, limite, disabled = false }) {
  const contador = limite ? (
    <small className="ens2campocontador">
      {valor.length}/{limite}
    </small>
  ) : null;

  if (area) {
    return (
      <label className="ens2campo ens2campoarea">
        <span>{etiqueta}</span>
        <textarea
          name={nombre}
          value={valor}
          placeholder={placeholder}
          onChange={onChange}
          maxLength={limite}
          disabled={disabled}
        />
        {contador}
      </label>
    );
  }

  return (
    <label className="ens2campo">
      <span>{etiqueta}</span>
      <input
        type="text"
        name={nombre}
        value={valor}
        placeholder={placeholder}
        onChange={onChange}
        maxLength={limite}
        disabled={disabled}
      />
      {contador}
    </label>
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

function FormularioCrearEnsayo({ formulario, onChange, onSubmit, guardando, error }) {
  return (
    <form className="ens2panel ens2panelalta" onSubmit={onSubmit}>
      <header className="ens2panelcabecera">
        <h3>Crear nuevo ensayo</h3>
      </header>
      <div className="ens2formulario">
        <CampoEnsayo2
          etiqueta="Nombre del ensayo"
          nombre="nombre"
          valor={formulario.nombre}
          placeholder="Ej. Perfil aerodinamico 1"
          onChange={onChange}
          limite={LIMITES_CAMPOS_ENSAYO.nombre}
        />
        <CampoEnsayo2
          etiqueta="Objetivo"
          nombre="objetivo"
          valor={formulario.objetivo}
          placeholder="Ej. Medir velocidad a 60% de potencia"
          onChange={onChange}
          limite={LIMITES_CAMPOS_ENSAYO.objetivo}
        />
        <CampoEnsayo2
          etiqueta="Descripcion"
          nombre="descripcion"
          valor={formulario.descripcion}
          placeholder="Condiciones iniciales, montaje, material o incidencias previas"
          onChange={onChange}
          limite={LIMITES_CAMPOS_ENSAYO.descripcion}
          area
        />
      </div>

      <div className="ens2accionescrear">
        <button
          type="submit"
          className="ens2boton ens2botonprimario"
          disabled={guardando || !formularioCompleto(formulario)}
        >
          {guardando ? "Creando ensayo..." : "Crear ensayo"}
        </button>
        {error ? <span className="ens2errorlinea">{error}</span> : null}
      </div>
    </form>
  );
}

function PaginaEnsayos2({ usuarioActual, onAbrirControl, onCrearEnsayo }) {
  const { estadoTunel, accionesTunel } = useTunel();
  const ensayoActivo = obtenerEnsayoActivo(estadoTunel);
  const ensayos = estadoTunel.ensayos || [];
  const edicionBloqueada = Boolean(estadoTunel.medActiva);

  const [formCrear, setFormCrear] = useState({ ...FORMULARIO_VACIO });
  const [formEditar, setFormEditar] = useState(() => crearFormularioDesdeEnsayo(ensayoActivo));
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [errorEditar, setErrorEditar] = useState("");

  useEffect(() => {
    setFormEditar(crearFormularioDesdeEnsayo(ensayoActivo));
  }, [ensayoActivo?.id]);

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

    if (guardandoCrear || !formularioCompleto(formCrear)) {
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
      setErrorEditar("No se puede editar el ensayo mientras hay una medicion activa.");
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
          error={errorCrear}
        />

        <section className="ens2panel ens2panelfichaunica">
          <header className="ens2panelcabecera">
            <h3>Editar ensayo activo</h3>
          </header>

          {ensayoActivo ? (
            <div className="ens2fichaunica">
              <div className="ens2resumenficha">
                <div>
                  <span>Codigo</span>
                  <strong>{ensayoActivo.codigo}</strong>
                </div>
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
                {edicionBloqueada ? <p className="ens2error">No se puede editar el ensayo mientras hay una medicion activa.</p> : null}
                {!edicionBloqueada && errorEditar ? <p className="ens2error">{errorEditar}</p> : null}
                <div className="ens2formulario">
                  <CampoEnsayo2
                    etiqueta="Nombre del ensayo"
                    nombre="nombre"
                    valor={formEditar.nombre}
                    placeholder="Nombre del ensayo"
                    onChange={cambiarFormularioEditar}
                    limite={LIMITES_CAMPOS_ENSAYO.nombre}
                    disabled={edicionBloqueada}
                  />
                  <CampoEnsayo2
                    etiqueta="Objetivo"
                    nombre="objetivo"
                    valor={formEditar.objetivo}
                    placeholder="Objetivo del ensayo"
                    onChange={cambiarFormularioEditar}
                    limite={LIMITES_CAMPOS_ENSAYO.objetivo}
                    disabled={edicionBloqueada}
                  />
                  <CampoEnsayo2
                    etiqueta="Descripcion"
                    nombre="descripcion"
                    valor={formEditar.descripcion}
                    placeholder="Descripcion"
                    onChange={cambiarFormularioEditar}
                    limite={LIMITES_CAMPOS_ENSAYO.descripcion}
                    area
                    disabled={edicionBloqueada}
                  />
                </div>

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
        <header className="ens2panelcabecera">
          <h3>Ensayos creados</h3>
          <strong className="ens2contadorlista">{ensayos.length} total</strong>
        </header>

        {ensayos.length ? (
          <div className="ens2lista ens2listahorizontal">
            {ensayos.map((ensayo) => {
              const activo = ensayoActivo?.id === ensayo.id;
              return (
                <article className={`ens2item ${activo ? "ens2itemactivo" : ""}`} key={ensayo.id}>
                  <div className="ens2itemcontenido">
                    <span className="ens2itemcodigo">{ensayo.codigo}</span>
                    <strong>{ensayo.nombre}</strong>
                    <p>{ensayo.objetivo}</p>
                    <span>{ensayo.fecha} - {ensayo.hora}</span>
                    <span>{ensayo.mediciones?.length || 0} mediciones</span>
                  </div>
                  <div className="ens2itemacciones">
                    <button
                      type="button"
                      className="ens2boton ens2botonsecundario"
                      onClick={() => activarEnsayo(ensayo)}
                      disabled={activo}
                    >
                      {activo ? "Seleccionado" : "Seleccionar"}
                    </button>
                    <button
                      type="button"
                      className="ens2boton ens2botonprimario"
                      onClick={() => {
                        activarEnsayo(ensayo);
                        abrirControl();
                      }}
                    >
                      Ir a control
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="ens2vacio">
            <p>Todavia no hay ensayos creados.</p>
          </article>
        )}
      </section>
    </div>
  );
}

export default PaginaEnsayos2;







