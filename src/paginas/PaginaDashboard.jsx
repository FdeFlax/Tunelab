import { lazy, Suspense, useEffect, useState } from "react";
import {
  MAX_EVENTOS_ALERTA,
  MAX_EVENTOS_INFO,
  contarAlarmasActivas,
  formatearTiempoFuncionamiento,
  obtenerEnsayoActivo,
  obtenerEstadoOperativoTunel,
} from "../servicios/tunel/estadoTunel";
import { useConexionTunel, useTunel } from "../logicaPantallas/useTunel";
import { obtenerUltimaMedicionUsuarioApi } from "../servicios/api/registroApi";
import { formatearFechaHora, formatearNumero, redondear } from "../servicios/formato";
import { calcularCaudalMaximoM3s, obtenerVelocidadMaximaCalibrada } from "../servicios/tunel/fichaTunel";
import { VISTAS_TUNEL } from "../components/visor/ajustesTunel.js";

const VisorTunel = lazy(() => import("../components/visor/VisorTunel"));

const ARCO_MEDIDOR = "M 20 96 A 76 76 0 0 1 172 96";
const VELOCIDAD_MAX_DASHBOARD_MS = obtenerVelocidadMaximaCalibrada();
const CAUDAL_MAX_DASHBOARD_M3S = calcularCaudalMaximoM3s();

const PESTANAS_SUPERVISION = [
  { id: "resumen", texto: "Resumen" },
  { id: "advertencias", texto: "Advertencias" },
  { id: "info", texto: "Info" },
];

function limitarPorcentaje(valor, maximo) {
  if (!maximo) {
    return 0;
  }

  return Math.max(0, Math.min(100, (Number(valor) / maximo) * 100));
}


function obtenerEventosDePestana(pestanaActiva, alarmas) {
  if (pestanaActiva === "advertencias") {
    return alarmas
      .filter((evento) => evento.nivel === "advertencia" || evento.nivel === "critica")
      .slice(0, MAX_EVENTOS_ALERTA);
  }

  if (pestanaActiva === "info") {
    return alarmas.filter((evento) => evento.nivel === "info").slice(0, MAX_EVENTOS_INFO);
  }

  return [];
}

function TarjetaPanel({ titulo, valor, detalle, tono = "azul", conAviso = false }) {
  return (
    <article className={`dash2tarjeta dash2tarjeta--${tono}`}>
      {conAviso ? <span className="dash2alertamini">!</span> : null}
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </article>
  );
}

function MedidorPanel({ titulo, valor, maximo, unidad, objetivo, tono = "azul" }) {
  const porcentaje = limitarPorcentaje(valor, maximo);

  return (
    <article className={`dash2tarjeta dash2tarjetamedidor dash2tarjeta--${tono}`}>
      <span>{titulo}</span>
      <div className="dash2medidor">
        <svg viewBox="0 -6 192 116" aria-hidden="true">
          <path className="dash2medidorfondo" d={ARCO_MEDIDOR} pathLength="100" />
          <path
            className="dash2medidorrelleno"
            d={ARCO_MEDIDOR}
            pathLength="100"
            style={{ "--dash2medidor": porcentaje }}
          />
        </svg>
        <strong>
          {formatearNumero(valor, 2)}
          <small>{unidad}</small>
        </strong>
      </div>
      {objetivo ? <small>{objetivo}</small> : null}
    </article>
  );
}

function PanelEventos({ eventos, tipo }) {
  return (
    <section className="dash2paneleventos">
      <div className="dash2paneleventoscabecera">
        <div>
          <h4>{tipo === "advertencias" ? "Advertencias y errores criticos" : "Eventos informativos"}</h4>
        </div>
      </div>

      <div className="dash2eventoslista">
        {eventos.length ? (
          eventos.map((evento) => (
            <article className={`dash2evento dash2evento--${evento.nivel}`} key={evento.id}>
              <div>
                <strong>{evento.etiqueta}</strong>
                <span>{evento.hora}</span>
              </div>
              <p>{evento.mensaje}</p>
            </article>
          ))
        ) : (
          <div className="dash2vacio">
            <strong>Sin eventos en esta categoria</strong>
            <span>No hay registros recientes para mostrar.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function UltimaMedicionUsuario({ estado, onAbrirRegistro }) {
  const medicion = estado.datos?.medicion || null;
  const ensayo = estado.datos?.ensayo || null;

  return (
    <article className="dash2card dash2ultimamedicion">
      <div className="dash2seccioncabecera">
        <div>
          <h3>Última medición de este usuario</h3>
        </div>
        <button className="dash2boton dash2ultimaver" type="button" onClick={onAbrirRegistro}>
          Ver todas
        </button>
      </div>

      {estado.cargando ? (
        <div className="dash2vacio dash2ultimavacio">
          <strong>Cargando registro</strong>
          <span>Buscando la ultima medicion guardada.</span>
        </div>
      ) : estado.error ? (
        <div className="dash2vacio dash2ultimavacio">
          <strong>No se ha podido consultar</strong>
          <span>{estado.error}</span>
        </div>
      ) : medicion ? (
        <div className="dash2ultimacuerpo">
          <div className="dash2ultimaprincipal">
            <span>Medición</span>
            <strong>{medicion.nombre}</strong>
            <small>
              {ensayo?.nombre || "Sin nombre"}
            </small>
          </div>
          <dl className="dash2ultimadatos">
            <div>
              <dt>Fecha</dt>
              <dd>{formatearFechaHora(medicion.creado_en)}</dd>
            </div>
            <div>
              <dt>Duracion</dt>
              <dd>{formatearTiempoFuncionamiento(medicion.duracion_segundos || 0)}</dd>
            </div>
            <div>
              <dt>Velocidad media</dt>
              <dd>{redondear(medicion.velocidad_media)} m/s</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{medicion.estado}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="dash2vacio dash2ultimavacio">
          <strong>Sin mediciones guardadas</strong>
          <span>Cuando este usuario registre una medicion, aparecera aqui.</span>
        </div>
      )}
    </article>
  );
}

function PaginaDashboard({ onAbrirControl, onAbrirRegistro }) {
  const [mostrarVisor3d, setMostrarVisor3d] = useState(false);
  const [pestanaSupervision, setPestanaSupervision] = useState("resumen");
  const { conexion: conexionTunel } = useConexionTunel();
  const [ultimaMedicionUsuario, setUltimaMedicionUsuario] = useState({
    cargando: true,
    datos: null,
    error: "",
  });
  const { estadoTunel } = useTunel();
  const ensayoActivo = obtenerEnsayoActivo(estadoTunel);
  const avisosActivos = contarAlarmasActivas(estadoTunel.alarmas);
  const estadoOperativo = obtenerEstadoOperativoTunel(estadoTunel, { conectado: Boolean(conexionTunel?.usuario || conexionTunel?.conectado) });
  const eventosVisibles = obtenerEventosDePestana(pestanaSupervision, estadoTunel.alarmas);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setMostrarVisor3d(true);
    }, 120);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarUltimaMedicion() {
      try {
        const datos = await obtenerUltimaMedicionUsuarioApi();
        if (activo) {
          setUltimaMedicionUsuario({ cargando: false, datos, error: "" });
        }
      } catch {
        if (activo) {
          setUltimaMedicionUsuario({
            cargando: false,
            datos: null,
            error: "Comprueba que el servidor esta disponible.",
          });
        }
      }
    }

    function refrescarSiVisible() {
      if (!document.hidden) {
        void cargarUltimaMedicion();
      }
    }

    void cargarUltimaMedicion();
    window.addEventListener("focus", refrescarSiVisible);
    window.addEventListener("tunelab:registro-actualizado", refrescarSiVisible);
    document.addEventListener("visibilitychange", refrescarSiVisible);

    return () => {
      activo = false;
      window.removeEventListener("focus", refrescarSiVisible);
      window.removeEventListener("tunelab:registro-actualizado", refrescarSiVisible);
      document.removeEventListener("visibilitychange", refrescarSiVisible);
    };
  }, []);

  const datosContexto = [
    {
      titulo: "Modo",
      valor: estadoTunel.fuente ? estadoTunel.fuente : "Desconocido",
      tono: "azul",
    },
    {
      titulo: "Ensayo",
      valor: ensayoActivo ? ensayoActivo.nombre : "Sin ensayo activo",
      tono: "cian",
    },
    {
      titulo: "Tiempo de funcionamiento",
      valor: formatearTiempoFuncionamiento(estadoTunel.tiempoSeg),
      tono: "azul",
    },
  ];

  const medidores = [
    {
      titulo: "Velocidad del aire",
      valor: estadoTunel.velMs,
      maximo: VELOCIDAD_MAX_DASHBOARD_MS,
      unidad: "m/s",
      tono: "cian",
    },
    {
      titulo: "Caudal",
      valor: estadoTunel.caudalM3s ?? 0,
      maximo: CAUDAL_MAX_DASHBOARD_M3S,
      unidad: "m³/s",
      tono: "azul",
    },
    {
      titulo: "Consigna variador",
      valor: estadoTunel.consignaVariadorPct ?? estadoTunel.potPct,
      maximo: 100,
      unidad: "%",
      tono: "azul",
    },
  ];

  const datosEstado = [
    {
      titulo: "Uso del tunel",
      valor: conexionTunel?.usuario ? "Ocupado" : "Libre",
      tono: conexionTunel?.usuario ? "ambar" : "verde",
    },
    {
      titulo: "Medicion activa",
      valor: estadoTunel.medActiva ? "SI" : "NO",
      tono: estadoTunel.medActiva ? "verde" : "azul",
    },
    {
      titulo: "Alarma general",
      valor: avisosActivos ? `${avisosActivos} avisos` : "Sin avisos",
      tono: avisosActivos ? "ambar" : "verde",
      conAviso: avisosActivos > 0,
    },
  ];


  return (
    <div className="page page--dashboard2">
      <section className="dash2operacion">
        <article className="dash2card dash2visorcard">
          <div className="dash2seccioncabecera">
            <div>
              <h2>Dashboard del tunel de viento</h2>
            </div>
          </div>

          <div className="dash2visor">
            <div className={`dash2estadoflotante dash2estadoflotante--${estadoOperativo.tono}`}>
              <span>Estado del tunel</span>
              <strong>{estadoOperativo.etiqueta}</strong>
              <small>{estadoOperativo.detalle}</small>
            </div>

            {mostrarVisor3d ? (
              <Suspense fallback={<div className="dash2visorcanvas dash2visorcanvasplaceholder" />}>
                <VisorTunel className="dash2visorcanvas" modoRendimiento="ligero" {...VISTAS_TUNEL.dashboard} />
              </Suspense>
            ) : (
              <div className="dash2visorcanvas dash2visorcanvasplaceholder" />
            )}
          </div>
        </article>

        <aside className="dash2card dash2panelprincipal">
          <div className="dash2seccioncabecera">
            <div>
              <h3>Panel principal</h3>
            </div>
          </div>

          <div className="dash2tabs">
            {PESTANAS_SUPERVISION.map((pestana) => (
              <button
                key={pestana.id}
                className={pestanaSupervision === pestana.id ? "dash2tabactivo" : ""}
                type="button"
                onClick={() => setPestanaSupervision(pestana.id)}
              >
                {pestana.texto}
                {pestana.id === "advertencias" && avisosActivos > 0 ? (
                  <span className="dash2alertamini">!</span>
                ) : null}
              </button>
            ))}
          </div>

          {pestanaSupervision === "resumen" ? (
            <div className="dash2rejillapanel">
              {datosContexto.map((dato) => (
                <TarjetaPanel key={dato.titulo} {...dato} />
              ))}

              {medidores.map((medidor) => (
                <MedidorPanel key={medidor.titulo} {...medidor} />
              ))}

              {datosEstado.map((dato) => (
                <TarjetaPanel key={dato.titulo} {...dato} />
              ))}
            </div>
          ) : (
            <PanelEventos eventos={eventosVisibles} tipo={pestanaSupervision} />
          )}

          <div className="dash2panelacciones">
            <button className="dash2boton dash2botonprimario" onClick={onAbrirControl}>
              Ir a control
            </button>
            <button className="dash2boton" onClick={onAbrirRegistro}>
              Ver registro
            </button>
          </div>
        </aside>
      </section>

      <section className="dash2inferior">
        <UltimaMedicionUsuario estado={ultimaMedicionUsuario} onAbrirRegistro={onAbrirRegistro} />
      </section>
    </div>
  );
}

export default PaginaDashboard;
