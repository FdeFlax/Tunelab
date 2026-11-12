import { useEffect, useRef, useState } from "react";
import PaginaDashboard from "./paginas/PaginaDashboard";
import PaginaInspeccion from "./paginas/PaginaInspeccion";
import PaginaControl from "./paginas/PaginaControl";
import PaginaEnsayos from "./paginas/PaginaEnsayos";
import PaginaRegistro from "./paginas/PaginaRegistro";
import PaginaDocente from "./paginas/PaginaDocente";
import PaginaAerodinamica from "./paginas/PaginaAerodinamica";
import { AERODINAMICA_VISIBLE } from "./funcionalidades";
import BarraLateral from "./components/interfaz/BarraLateral";
import LoginLocal from "./components/interfaz/LoginLocal";
import { borrarIdentidadApi, configurarIdentidadApi, leerIdentidadApi } from "./servicios/api/clienteApi";
import { useTunel } from "./logicaPantallas/useTunel";
import { useEnsayosPersistidos } from "./logicaPantallas/useEnsayos";

function leerUsuarioInicial() {
  const identidad = leerIdentidadApi();

  if (!identidad?.identificador) return null;

  return {
    id: identidad.identificador,
    usuario: identidad.identificador,
    nombre: identidad.nombre || "Usuario UACloud",
    email: identidad.email || "",
    rol: identidad.rol || "alumno",
  };
}

function App() {
  const { estadoTunel, accionesTunel } = useTunel();
  const [paginaSolicitada, setPaginaActual] = useState("dashboard");
  const paginaActual = paginaSolicitada === "aerodinamica" && !AERODINAMICA_VISIBLE ? "dashboard" : paginaSolicitada;
  const [aerodinamicaVisitada, setAerodinamicaVisitada] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(leerUsuarioInicial);
  const [barraAbierta, setBarraAbierta] = useState(true);
  const [avisoGlobal, setAvisoGlobal] = useState("");
  const temporizadorAviso = useRef(null);
  const tunelEncendido = estadoTunel.estadoTunel === "RUNNING";
  const esDocente = ["profesor", "tecnico", "admin"].includes(usuarioActual?.rol);

  useEffect(() => {
    if (!usuarioActual) {
      return;
    }

    configurarIdentidadApi(usuarioActual);
    accionesTunel.iniciar?.();
    return () => accionesTunel.detener?.();
  }, [accionesTunel, usuarioActual]);

  useEnsayosPersistidos(usuarioActual, accionesTunel);

  function mostrarAvisoGlobal(mensaje) {
    if (temporizadorAviso.current) {
      window.clearTimeout(temporizadorAviso.current);
    }

    setAvisoGlobal(mensaje);

    temporizadorAviso.current = window.setTimeout(() => {
      setAvisoGlobal("");
      temporizadorAviso.current = null;
    }, 2200);
  }

  function cambiarPaginaSegura(pagina) {
    if (pagina === "aerodinamica" && !AERODINAMICA_VISIBLE) return;
    if (pagina === "docente" && !esDocente) {
      mostrarAvisoGlobal("La pagina Docente solo esta disponible para profesorado y personal tecnico");
      return;
    }

    if (pagina === "aerodinamica") setAerodinamicaVisitada(true);
    setPaginaActual(pagina);
  }

  function entrarConUsuario(usuario) {
    setAerodinamicaVisitada(false);
    configurarIdentidadApi(usuario);
    setUsuarioActual(usuario);
    setPaginaActual("dashboard");
  }

  function cerrarSesionLocal() {
    if (tunelEncendido) {
      mostrarAvisoGlobal("Apaga el tunel antes de cerrar sesion");
      return;
    }

    borrarIdentidadApi();
    setAerodinamicaVisitada(false);
    accionesTunel.reiniciar?.();
    setUsuarioActual(null);
    setPaginaActual("dashboard");
  }

  function obtenerTituloPagina() {
    switch (paginaActual) {
      case "control":
        return "Control";
      case "inspeccion":
        return "Inspección";
      case "ensayos":
        return "Ensayos";
      case "registro":
        return "Registro";
      case "aerodinamica":
        return "Aerodinámica";
      case "docente":
        return esDocente ? "Docente" : "Dashboard";
      case "dashboard":
      default:
        return "Dashboard";
    }
  }

  function renderizarPagina() {
    switch (paginaActual) {
      case "control":
        return <PaginaControl />;
      case "inspeccion":
        return <PaginaInspeccion />;
      case "ensayos":
        return (
          <PaginaEnsayos
            usuarioActual={usuarioActual}
            onAbrirControl={() => cambiarPaginaSegura("control")}
            onCrearEnsayo={() => mostrarAvisoGlobal("Ensayo creado")}
          />
        );
      case "registro":
        return <PaginaRegistro />;
      case "aerodinamica":
        return null;
      case "docente":
        return esDocente ? <PaginaDocente /> : (
          <PaginaDashboard
            onAbrirControl={() => cambiarPaginaSegura("control")}
            onAbrirRegistro={() => cambiarPaginaSegura("registro")}
          />
        );
      case "dashboard":
      default:
        return (
          <PaginaDashboard
            onAbrirControl={() => cambiarPaginaSegura("control")}
            onAbrirRegistro={() => cambiarPaginaSegura("registro")}
          />
        );
    }
  }

  if (!usuarioActual) {
    return <LoginLocal onEntrar={entrarConUsuario} />;
  }

  const claseApp = `app-shell ${barraAbierta ? "app-shell--open" : "app-shell--collapsed"}`;

  return (
    <div className={claseApp}>
      <BarraLateral
        paginaActual={paginaActual}
        cambiarPagina={cambiarPaginaSegura}
        barraAbierta={barraAbierta}
        cambiarBarraAbierta={setBarraAbierta}
        usuarioActual={usuarioActual}
        onLogout={cerrarSesionLocal}
      />

      <div className="app-main">
        {avisoGlobal ? <div className="aviso-global">{avisoGlobal}</div> : null}
        <div className={"app-content app-content--" + paginaActual}>
          <header className="app-page-title">
            <h1>{obtenerTituloPagina()}</h1>
          </header>
          {renderizarPagina()}
          {AERODINAMICA_VISIBLE && aerodinamicaVisitada && (
            <div hidden={paginaActual !== "aerodinamica"}>
              <PaginaAerodinamica key={usuarioActual.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
