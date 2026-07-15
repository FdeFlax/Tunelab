import { useEffect, useRef, useState } from "react";
import PaginaDashboard from "./pages/PaginaDashboard2";
import PaginaInspeccion from "./pages/PaginaInspeccion";
import PaginaControl from "./pages/PaginaControl2";
import PaginaEnsayos from "./pages/PaginaEnsayos2";
import PaginaRegistro from "./pages/PaginaRegistro2";
import PaginaDocente from "./pages/PaginaDocente";
import BarraLateral from "./components/BarraLateral";
import LoginLocal from "./components/LoginLocal";
import { borrarIdentidadApi, configurarIdentidadApi, leerIdentidadApi } from "./servicios/api/clienteApi";
import {
  asegurarUsuarioApi,
  listarEnsayosApi,
  listarMedicionesEnsayoApi,
  vincularEnsayoApi,
} from "./servicios/api/ensayosApi";
import { useTunel } from "./servicios/tunel/useTunel";

function leerUsuarioInicial() {
  const identidad = leerIdentidadApi();

  if (!identidad) {
    return null;
  }

  if (!identidad.identificador) {
    return null;
  }

  let nombre = identidad.nombre;
  if (!nombre) {
    nombre = "Usuario UACloud";
  }

  let email = identidad.email;
  if (!email) {
    email = "";
  }

  let rol = identidad.rol;
  if (!rol) {
    rol = "alumno";
  }

  return {
    id: identidad.identificador,
    usuario: identidad.identificador,
    nombre,
    email,
    rol,
  };
}

function App() {
  const { estadoTunel, accionesTunel } = useTunel();
  const [paginaActual, setPaginaActual] = useState("dashboard");
  const [usuarioActual, setUsuarioActual] = useState(leerUsuarioInicial);
  const [barraAbierta, setBarraAbierta] = useState(true);
  const [avisoGlobal, setAvisoGlobal] = useState("");
  const [temaClaro, setTemaClaro] = useState(() => {
    return window.localStorage.getItem("tunelab_tema") === "claro";
  });
  const temporizadorAviso = useRef(null);
  const tunelEncendido = estadoTunel.estadoTunel === "RUNNING";
  let esDocente = false;
  if (usuarioActual && usuarioActual.rol) {
    esDocente = ["profesor", "tecnico", "admin"].includes(usuarioActual.rol);
  }

  useEffect(() => {
    if (!usuarioActual) {
      return;
    }

    configurarIdentidadApi(usuarioActual);
  }, [usuarioActual]);

  useEffect(() => {
    let nombreTema = "oscuro";
    if (temaClaro) {
      nombreTema = "claro";
    }

    window.localStorage.setItem("tunelab_tema", nombreTema);
    document.body.classList.toggle("body--tema-claro", temaClaro);
  }, [temaClaro]);

  useEffect(() => {
    let cancelado = false;

    if (!usuarioActual) {
      return () => {
        cancelado = true;
      };
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
        return "--:--";
      }

      return new Date(fecha).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    function convertirMedicionApi(medicion) {
      return {
        id: `api-medicion-${medicion.id}`,
        nombre: medicion.nombre,
        fecha: formatearFecha(medicion.creado_en),
        hora: formatearHora(medicion.creado_en),
        durSeg: medicion.duracion_segundos ? medicion.duracion_segundos : 0,
        totalMuestras: 0,
        objVelMs: Number(medicion.velocidad_objetivo || 0),
        objPotPct: Number(medicion.potencia_objetivo || 0),
        velocidad: {
          media: Number(medicion.velocidad_media || 0),
          maxima: Number(medicion.velocidad_maxima || 0),
          minima: Number(medicion.velocidad_minima || 0),
          estabilidad: Math.max(
            0,
            Number(medicion.velocidad_maxima || 0) - Number(medicion.velocidad_minima || 0)
          ),
        },
        temperatura: {
          media: Number(medicion.temperatura_media || 0),
          maxima: Number(medicion.temperatura_media || 0),
          minima: Number(medicion.temperatura_media || 0),
        },
        potencia: {
          media: Number(medicion.potencia_media || 0),
          maxima: Number(medicion.potencia_media || 0),
          minima: Number(medicion.potencia_media || 0),
        },
        trazas: {
          velocidad: [],
          temperatura: [],
          potencia: [],
        },
        eventos: [],
        muestras: [],
      };
    }

    function convertirEnsayoApi(ensayo, mediciones) {
      let objetivoEnsayo = ensayo.objetivo;
      if (!objetivoEnsayo) {
        objetivoEnsayo = "Sin objetivo definido";
      }

      let descripcionEnsayo = ensayo.descripcion;
      if (!descripcionEnsayo) {
        descripcionEnsayo = "";
      }

      let estadoEnsayo = "Preparado";
      if (mediciones.length) {
        estadoEnsayo = "Con mediciones";
      }

      return {
        id: `api-ensayo-${ensayo.id}`,
        codigo: ensayo.codigo,
        nombre: ensayo.nombre,
        objetivo: objetivoEnsayo,
        descripcion: descripcionEnsayo,
        fecha: formatearFecha(ensayo.creado_en),
        hora: formatearHora(ensayo.creado_en),
        estado: estadoEnsayo,
        mediciones: mediciones.map(convertirMedicionApi),
      };
    }

    async function cargarDatosGuardados() {
      try {
        await asegurarUsuarioApi(usuarioActual);
        const ensayosApi = await listarEnsayosApi();
        const ensayosConMediciones = await Promise.all(
          ensayosApi.map(async (ensayo) => {
            const mediciones = await listarMedicionesEnsayoApi(ensayo.id);
            vincularEnsayoApi(ensayo.codigo, ensayo);
            return convertirEnsayoApi(ensayo, mediciones);
          })
        );

        if (!cancelado) {
          if (accionesTunel.cargarEnsayosPersistidos) {
            accionesTunel.cargarEnsayosPersistidos(ensayosConMediciones);
          }
        }
      } catch (error) {
        console.warn("No se han podido recuperar los ensayos guardados.", error);
      }
    }

    void cargarDatosGuardados();

    return () => {
      cancelado = true;
    };
  }, [accionesTunel, usuarioActual]);

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

  useEffect(() => {
    function avisarSalida(evento) {
      if (!tunelEncendido) {
        return;
      }

      evento.preventDefault();
      evento.returnValue = "";
    }

    window.addEventListener("beforeunload", avisarSalida);

    return () => {
      window.removeEventListener("beforeunload", avisarSalida);
    };
  }, [tunelEncendido]);

  function cambiarPaginaSegura(pagina) {
    if (pagina === "docente" && !esDocente) {
      mostrarAvisoGlobal("La pagina Docente solo esta disponible para profesorado y personal tecnico");
      return;
    }

    if (tunelEncendido && paginaActual === "control" && pagina !== "control") {
      mostrarAvisoGlobal("Apaga el tunel antes de salir de Control");
      return;
    }

    setPaginaActual(pagina);
  }

  function entrarConUsuario(usuario) {
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
        return <PaginaControl usuarioActual={usuarioActual} />;
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
        return (
          <PaginaRegistro
            usuarioActual={usuarioActual}
            onAbrirControl={() => cambiarPaginaSegura("control")}
          />
        );
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

  let claseApp = "app-shell";
  if (barraAbierta) {
    claseApp = claseApp + " app-shell--open";
  } else {
    claseApp = claseApp + " app-shell--collapsed";
  }

  if (temaClaro) {
    claseApp = claseApp + " appblanca";
  }

  return (
    <div className={claseApp}>
      <BarraLateral
        paginaActual={paginaActual}
        cambiarPagina={cambiarPaginaSegura}
        barraAbierta={barraAbierta}
        cambiarBarraAbierta={setBarraAbierta}
        usuarioActual={usuarioActual}
        temaClaro={temaClaro}
        onCambiarTema={() => setTemaClaro((temaActual) => !temaActual)}
        onLogout={cerrarSesionLocal}
      />

      <div className="app-main">
        {avisoGlobal ? <div className="aviso-global">{avisoGlobal}</div> : null}
        <div className={"app-content app-content--" + paginaActual}>
          <header className="app-page-title">
            <h1>{obtenerTituloPagina()}</h1>
          </header>
          {renderizarPagina()}
        </div>
      </div>
    </div>
  );
}

export default App;




