import { useEffect, useState } from "react";
import { API_URL, pedirApi } from "../../servicios/api/clienteApi";
import { COMPROBANDO_SERVIDOR, consultarDisponibilidadApi } from "../../servicios/api/disponibilidadApi";

const USUARIOS_PRUEBA = [
  {
    id: "alu_demo",
    usuario: "alu_demo",
    nombre: "Alumno Demo",
    email: "alu_demo@alu.ua.es",
    rol: "alumno",
  },
  {
    id: "prof_demo",
    usuario: "prof_demo",
    nombre: "Profesor Demo",
    email: "prof_demo@ua.es",
    rol: "profesor",
  },
];

function useDisponibilidadApi() {
  const [disponibilidad, setDisponibilidad] = useState(COMPROBANDO_SERVIDOR);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const cancelacion = new AbortController();
    let temporizador;
    async function comprobar() {
      const resultado = await consultarDisponibilidadApi(API_URL, cancelacion.signal);
      if (cancelacion.signal.aborted) return;
      setDisponibilidad(resultado);
      temporizador = setTimeout(comprobar, resultado.estado === "listo" ? 15000 : 5000);
    }
    void comprobar();
    return () => {
      cancelacion.abort();
      clearTimeout(temporizador);
    };
  }, [revision]);

  function revisar() {
    setDisponibilidad(COMPROBANDO_SERVIDOR);
    setRevision(actual => actual + 1);
  }
  return { disponibilidad, revisar };
}

function LoginLocal({ onEntrar }) {
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState("");
  const { disponibilidad, revisar } = useDisponibilidadApi();
  const listo = disponibilidad.estado === "listo";

  async function entrar(usuario) {
    if (entrando || !listo) return;
    setEntrando(true);
    setError("");
    try {
      const [validado] = await pedirApi("/usuarios", {
        headers: { "X-Usuario-Uacloud": usuario.usuario },
      });
      onEntrar({
        id: validado.identificador_uacloud,
        usuario: validado.identificador_uacloud,
        nombre: validado.nombre,
        email: validado.email,
        rol: validado.rol,
      });
    } catch (fallo) {
      setError(typeof fallo.detalle === "string" && fallo.detalle
        ? fallo.detalle : "Se ha perdido la conexión al entrar. Estamos comprobando el servidor; vuelve a elegir tu perfil cuando esté listo.");
      revisar();
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="loginlocal">
      <section className="loginlocalpanel" aria-labelledby="loginlocaltitulo">
        <h1 id="loginlocaltitulo">Túnel de viento</h1>

        <div className="loginlocalopciones" role="group" aria-label="Elegir perfil">
          {USUARIOS_PRUEBA.map((usuario) => (
            <button
              className="loginlocalboton"
              key={usuario.id}
              type="button"
              onClick={() => entrar(usuario)}
              disabled={entrando || !listo}
              aria-label={`Entrar como ${usuario.rol}`}
            >
              {usuario.rol === "alumno" ? "Alumno" : "Profesor"}
            </button>
          ))}
        </div>

        <div role="status" aria-live="polite">
          {!listo && <div className="loginlocalestado">
            <div>
              <strong>{disponibilidad.titulo}</strong>
              {disponibilidad.estado !== "comprobando" && <p>{disponibilidad.detalle}</p>}
            </div>
            {disponibilidad.estado !== "comprobando" && <button type="button"
              onClick={() => { setError(""); revisar(); }} disabled={entrando}>Reintentar</button>}
          </div>}
          {listo && entrando && <p className="loginlocalmensaje">Entrando…</p>}
        </div>
        {error && listo ? <p className="loginlocalmensaje" role="alert">{error}</p> : null}
      </section>
    </main>
  );
}

export default LoginLocal;
