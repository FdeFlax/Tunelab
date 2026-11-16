import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from 'three';
import CONFIGURACION_TUNEL from "../../shared/tunel.json";
import { VISUAL, VISTAS_TUNEL } from "../components/visor/ajustesTunel.js";
import { obtenerVelocidadMaximaCalibrada, calcularRelacionContraccion } from "../servicios/tunel/fichaTunel.js";

const VisorTunel = lazy(() => import("../components/visor/VisorTunel"));

const { geometria: GEOMETRIA, simulador: SIMULADOR } = CONFIGURACION_TUNEL;
const GIRO_ADICIONAL_MODELO = VISUAL.inspeccion.giroAdicionalModelo;
const numero = valor => valor.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const seccion = ({ anchoM, altoM }) => `${numero(anchoM)} × ${numero(altoM)} m`;
const VELOCIDAD_MAXIMA = numero(obtenerVelocidadMaximaCalibrada());

const EJE_Y = new Vector3(0, 1, 0);
const redondearPosicion = vector => vector.toArray().map((v, i) => i === 1 ? v : Number(v.toFixed(2)));
const rotarCoordenadaY = (posicion, angulo) => redondearPosicion(new Vector3(...posicion).applyAxisAngle(EJE_Y, angulo));

function rotarCamaraAlrededorDeObjetivo(camara, objetivo, angulo) {
  const centro = new Vector3(...objetivo);
  return redondearPosicion(new Vector3(...camara).sub(centro).applyAxisAngle(EJE_Y, angulo).add(centro));
}

const PUNTOS_TUNEL = [
  {
    id: "embocadura",
    etiqueta: "Embocadura",
    resumen: "Entrada inicial del túnel: recoge el aire y lo dirige de forma ordenada hacia la línea aerodinámica.",
    descripcion:
      "La embocadura incorpora curvas de entrada pensadas para reducir perturbaciones y turbulencias desde el inicio. Su geometría ayuda a que el flujo entre de manera uniforme antes de pasar a la cámara de estabilización.",
    datosClave: ["Entrada de aire", "Reduce perturbaciones", "Inicio del flujo"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Canaliza el aire exterior hacia el resto del túnel evitando entradas bruscas o desordenadas.",
      },
      {
        etiqueta: "Diseño",
        texto: "El perímetro está optimizado con curvas de entrada para mejorar el rendimiento aerodinámico.",
      },
      {
        etiqueta: "En inspección",
        texto: "Conviene comprobar que no haya objetos, polvo acumulado u obstrucciones en la zona de admisión.",
      },
    ],
  },
  {
    id: "camara-estabilizacion",
    etiqueta: "Cámara de estabilización",
    resumen: "Homogeneiza y suaviza el flujo antes de que entre en la contracción.",
    descripcion:
      GEOMETRIA.camaraEstabilizacion.honeycomb
        ? "En esta zona se estabiliza el aire que viene de la embocadura. El panel honeycomb ayuda a reducir los movimientos transversales del flujo."
        : "En esta zona se estabiliza el aire que viene de la embocadura. La configuración actual no incluye un panel honeycomb.",
    datosClave: [seccion(GEOMETRIA.camaraEstabilizacion), `Longitud ${numero(GEOMETRIA.camaraEstabilizacion.longitudM)} m`, GEOMETRIA.camaraEstabilizacion.honeycomb ? "Honeycomb" : "Sin honeycomb configurado"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Suaviza el flujo para que llegue a la contracción de forma más estable y repetible.",
      },
      {
        etiqueta: "Impacto en ensayo",
        texto: "Mejora la precisión de las mediciones al reducir irregularidades antes de la sección de ensayo.",
      },
      {
        etiqueta: "En inspección",
        texto: "Debe mantenerse limpia y sin elementos que alteren el paso del aire.",
      },
    ],
  },
  {
    id: "contraccion",
    etiqueta: "Contracción",
    resumen: "Reduce progresivamente la sección de paso para acelerar el aire hacia la zona de ensayo.",
    descripcion:
      "La contracción utiliza una geometría decreciente y una curva optimizada para acelerar el flujo de forma controlada. Su objetivo es conseguir una transición eficiente hacia la sección de ensayo manteniendo un flujo homogéneo.",
    datosClave: [`Longitud ${numero(GEOMETRIA.contraccion.longitudM)} m`, `Relación de áreas ${numero(calcularRelacionContraccion())}:1`, "Transición controlada"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Incrementa la velocidad del aire sin introducir cambios bruscos en el flujo.",
      },
      {
        etiqueta: "Diseño",
        texto: "La curva está pensada para evitar separaciones del flujo y mantener una aceleración uniforme.",
      },
      {
        etiqueta: "En inspección",
        texto: "Es importante que sus superficies no presenten deformaciones ni obstáculos internos.",
      },
    ],
  },
  {
    id: "seccion-ensayo",
    etiqueta: "Sección de ensayo",
    resumen: "Zona principal de pruebas: aquí se colocan los modelos, sensores o equipos de medida.",
    descripcion:
      `Es el tramo donde se realizan los ensayos. La sección configurada mide ${seccion(GEOMETRIA.seccionEnsayo)} y ${numero(GEOMETRIA.seccionEnsayo.longitudM)} m de longitud. Las ventanas permiten observar el ensayo.`,
    datosClave: [seccion(GEOMETRIA.seccionEnsayo), `Longitud ${numero(GEOMETRIA.seccionEnsayo.longitudM)} m`, `Curva hasta ${VELOCIDAD_MAXIMA} m/s`],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Permite colocar el modelo de ensayo y registrar la velocidad del flujo con el sistema de medida.",
      },
      {
        etiqueta: "Calibración",
        texto: `Máximo de ${VELOCIDAD_MAXIMA} m/s según los puntos de calibración configurados.`,
      },
      {
        etiqueta: "Seguridad",
        texto: "Antes de medir hay que comprobar que el modelo está fijado, las puertas cerradas y el tubo de Pitot alineado.",
      },
    ],
  },
  {
    id: "difusor-adaptador",
    etiqueta: "Difusor",
    resumen: "Conecta la sección de ensayo con la turbomáquina.",
    descripcion:
      "El difusor actúa como transición geométrica y como difusor del flujo. Aumenta progresivamente el área de paso para reducir la velocidad, recuperar presión y minimizar pérdidas por separación del flujo.",
    datosClave: [`Envolvente ${seccion(GEOMETRIA.difusor.envolvente)}`, `Longitud ${numero(GEOMETRIA.difusor.envolvente.longitudM)} m`, "Recupera presión"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Conecta la sección de ensayo con la brida y la turbomáquina en un único módulo compacto.",
      },
      {
        etiqueta: "Diseño",
        texto: GEOMETRIA.difusor.salida.forma === "desconocida" ? "La forma y las medidas interiores de salida están pendientes de confirmar." : `Forma de salida configurada: ${GEOMETRIA.difusor.salida.forma}.`,
      },
      {
        etiqueta: "En inspección",
        texto: "Debe revisarse que no haya daños, piezas sueltas o zonas que puedan alterar la transición del flujo.",
      },
    ],
  },
  {
    id: "brida-conexion",
    etiqueta: "Brida",
    resumen: "Une el difusor con la turbomáquina y ayuda a mantener la integridad estructural del conjunto.",
    descripcion:
      "La brida asegura la unión entre el difusor-adaptador y la turbomáquina. También contribuye a amortiguar vibraciones generadas por la turbomáquina para que no se transmitan al resto de la instalación.",
    datosClave: ["Unión estructural", "Alineación", "Amortigua vibraciones"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Mantiene conectados y alineados los dos módulos finales del túnel.",
      },
      {
        etiqueta: "Estabilidad",
        texto: "Ayuda a que el funcionamiento sea estable y continuo durante los ensayos.",
      },
      {
        etiqueta: "En inspección",
        texto: "Conviene revisar fijaciones, alineación y ausencia de vibraciones anómalas.",
      },
    ],
  },
  {
    id: "turbomaquina",
    etiqueta: "Turbomáquina",
    resumen: "Genera el caudal de aire necesario para que el túnel funcione.",
    descripcion:
      "La turbomáquina impulsa el flujo de aire y su régimen se ajusta mediante el variador de frecuencia. Esto permite modificar la velocidad del flujo de forma precisa y adaptarla al ensayo.",
    datosClave: ["Genera el flujo", "Control por variador", "Velocidad regulable"],
    detalles: [
      {
        etiqueta: "Función",
        texto: "Aporta la energía necesaria para mantener el flujo dentro de los parámetros previstos.",
      },
      {
        etiqueta: "Simulación",
        texto: `El simulador usa máximos de ${numero(SIMULADOR.frecuenciaMaximaHz)} Hz, ${numero(SIMULADOR.rpmMaximas)} RPM y ${numero(SIMULADOR.corrienteMaximaA)} A. Son referencias configurables, pendientes de contrastar con el equipo.`,
      },
      {
        etiqueta: "Seguridad",
        texto: "No deben manipularse sus protecciones ni introducir objetos en su entrada o salida.",
      },
    ],
  },
].map(punto => ({ ...punto, ...VISUAL.puntosInspeccion[punto.id] }));

const PUNTO_VISTA_GENERAL = {
  id: "",
  etiqueta: "Vista general del túnel",
  resumen: "Selecciona una etiqueta para enfocar una zona concreta del túnel.",
  descripcion:
    "Desde la vista general puedes explorar el modelo libremente y elegir una zona para centrar la cámara. La información inferior resume la función, el diseño y las comprobaciones más relevantes de cada componente.",
  datosClave: [],
  detalles: [
    {
      etiqueta: "Cómo usar esta vista",
      texto: "Pulsa una etiqueta del modelo o un punto de la lista para enfocar la cámara sobre esa parte del túnel.",
    },
    {
      etiqueta: "Objetivo",
      texto: "Relacionar visualmente cada componente con su función real dentro del flujo de aire.",
    },
  ],
};

function crearVistaInspeccion(punto) {
  if (!punto?.vista) {
    return null;
  }

  const [x, y, z] = punto.vista.camara;
  const [escalaX, escalaY, escalaZ] = punto.escalaVista || VISUAL.inspeccion.escalaVistaPorDefecto;
  const objetivoGirado = rotarCoordenadaY(punto.vista.objetivo, GIRO_ADICIONAL_MODELO);
  const camaraEscalada = [
    Number((x * escalaX).toFixed(2)),
    Number((y * escalaY).toFixed(2)),
    Number((z * escalaZ).toFixed(2)),
  ];
  const camaraAjustada = punto.giroVistaExtra
    ? rotarCamaraAlrededorDeObjetivo(camaraEscalada, objetivoGirado, punto.giroVistaExtra)
    : camaraEscalada;

  return {
    camara: camaraAjustada,
    objetivo: objetivoGirado,
  };
}

function PaginaInspeccion() {
  const [puntoActivoId, setPuntoActivoId] = useState("");
  const [contadorReinicioVista, setContadorReinicioVista] = useState(0);
  const [mostrarReinicioVista, setMostrarReinicioVista] = useState(false);
  const [vistaCamaraActiva, setVistaCamaraActiva] = useState(null);
  const [mostrarVisor3d, setMostrarVisor3d] = useState(false);
  const [desplegableEtiquetasAbierto, setDesplegableEtiquetasAbierto] = useState(false);
  const selectorEtiquetasRef = useRef(null);

  const puntoActivo = useMemo(
    () =>
      PUNTOS_TUNEL.find((punto) => punto.id === puntoActivoId) || PUNTO_VISTA_GENERAL,
    [puntoActivoId]
  );
  const vistaPuntoActivo = useMemo(() => crearVistaInspeccion(puntoActivo), [puntoActivo]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setMostrarVisor3d(true);
    }, 120);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, []);
  useEffect(() => {
    function cerrarSiSeHaceClickFuera(evento) {
      if (!selectorEtiquetasRef.current?.contains(evento.target)) {
        setDesplegableEtiquetasAbierto(false);
      }
    }

    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        setDesplegableEtiquetasAbierto(false);
      }
    }

    document.addEventListener("mousedown", cerrarSiSeHaceClickFuera);
    document.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.removeEventListener("mousedown", cerrarSiSeHaceClickFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, []);

  const seleccionarPunto = useCallback((puntoId) => {
    const puntoSeleccionado = PUNTOS_TUNEL.find((punto) => punto.id === puntoId);

    setPuntoActivoId(puntoId);
    setVistaCamaraActiva(crearVistaInspeccion(puntoSeleccionado));
    setDesplegableEtiquetasAbierto(false);
  }, []);

  const gestionarInteraccionManualModelo = useCallback(() => {
    setMostrarReinicioVista(true);
    setPuntoActivoId("");
    setDesplegableEtiquetasAbierto(false);
  }, []);

  const volverAVistaInicial = useCallback(() => {
    setPuntoActivoId("");
    setVistaCamaraActiva(null);
    setMostrarReinicioVista(false);
    setContadorReinicioVista((valorActual) => valorActual + 1);
    setDesplegableEtiquetasAbierto(false);
  }, []);

  return (
    <div className="page page--inspeccion">
      <section className="inspescena">
        <div className="inspescenafondo">
          {mostrarVisor3d ? (
            <Suspense fallback={<div className="inspescenacanvas inspescenacanvasplaceholder" />}>
              <VisorTunel
                className="inspescenacanvas"
                vistaActiva={vistaCamaraActiva || vistaPuntoActivo}
                puntosInteres={PUNTOS_TUNEL}
                puntoActivoId={puntoActivoId}
                onSeleccionarPunto={seleccionarPunto}
                {...VISTAS_TUNEL.inspeccion}
                zoomHabilitado={false}
                solicitudReinicio={contadorReinicioVista}
                onCambioVistaAlterada={setMostrarReinicioVista}
                onInteraccionUsuario={gestionarInteraccionManualModelo}
                dprLigeroMaximo={1}
                modoRendimiento="ligero"
                ocultarEtiquetasDuranteInteraccion
              />
            </Suspense>
          ) : (
            <div className="inspescenacanvas inspescenacanvasplaceholder" />
          )}
        </div>

        <div className="inspescenalateral">
          <div ref={selectorEtiquetasRef} className="inspselector">
            <span className="inspselectoretiqueta">Etiquetas del túnel</span>
            <button
              type="button"
              className="inspselectorcontrol"
              onClick={() =>
                setDesplegableEtiquetasAbierto((valorActual) => !valorActual)
              }
              aria-haspopup="listbox"
              aria-expanded={desplegableEtiquetasAbierto}
            >
              <span className="inspselectorvalor">
                {puntoActivoId ? puntoActivo.etiqueta : "Selecciona una etiqueta"}
              </span>
              <span
                className={`inspselectorflecha ${
                  desplegableEtiquetasAbierto ? "inspselectorflechaabierta" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {desplegableEtiquetasAbierto ? (
              <div className="inspselectorlista" role="listbox">
                {PUNTOS_TUNEL.map((punto) => (
                  <button
                    key={punto.id}
                    type="button"
                    className={`inspselectoritem ${
                      punto.id === puntoActivoId ? "inspselectoritemactivo" : ""
                    }`}
                    onClick={() => seleccionarPunto(punto.id)}
                  >
                    {punto.etiqueta}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className={`inspreset ${
            mostrarReinicioVista ? "inspresetvisible" : ""
          }`}
          onClick={volverAVistaInicial}
        >
          Volver a la posición inicial
        </button>

        <div className="inspescenainferior">
          <article className="inspactivo">
            <div className="inspactivocabecera">
              <div>
                <h3 className="inspactivotitulo">{puntoActivo.etiqueta}</h3>
              </div>
            </div>

            <div className="inspactivocuerpo">
              <p className="inspactivoresumen">{puntoActivo.resumen}</p>
              <p className="inspactivotexto">{puntoActivo.descripcion}</p>

              {puntoActivo.datosClave?.length ? (
                <div className="inspchips" aria-label="Datos clave">
                  {puntoActivo.datosClave.map((dato) => (
                    <span key={dato} className="inspchip">{dato}</span>
                  ))}
                </div>
              ) : null}

              {puntoActivo.detalles?.length ? (
                <div className="inspdetalles">
                  {puntoActivo.detalles.map((detalle) => (
                    <section key={detalle.etiqueta} className="inspdetalle">
                      <div>
                        <span>{detalle.etiqueta}</span>
                        <p>{detalle.texto}</p>
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          </article>

          <aside className="insppuntos">
            <div className="insppuntoscabecera">
              <div>
                <h3 className="inspactivotitulo">Puntos de interés</h3>
              </div>
            </div>

            <div className="insplista">
              {PUNTOS_TUNEL.map((punto) => (
                <button
                  key={punto.id}
                  type="button"
                  className={`inspitem ${
                    punto.id === puntoActivoId ? "inspitemactivo" : ""
                  }`}
                  onClick={() => seleccionarPunto(punto.id)}
                >
                  <span>
                    <strong>{punto.etiqueta}</strong>
                    <small>{punto.resumen}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default PaginaInspeccion;
