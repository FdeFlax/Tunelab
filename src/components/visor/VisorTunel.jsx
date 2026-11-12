import { memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Visor3D from './Visor3D';
import ControladorCamara from './ControladorCamara';
import { ModeloTunel } from './ModeloTunel';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VISTAS_TUNEL } from './ajustesTunel.js';

const VISTA = VISTAS_TUNEL.visor;

function IluminacionLocal() {
  const obtenerEscena = useThree(state => state.get);

  useEffect(() => {
    // Three.js mantiene objetos mutables propios; se accede a ellos desde el efecto.
    const { gl, scene, invalidate } = obtenerEscena();
    const entornoAnterior = scene.environment;

    const entorno = new RoomEnvironment();
    const generadorEntorno = new PMREMGenerator(gl);
    const mapaEntorno = generadorEntorno.fromScene(entorno, 0.04);

    scene.environment = mapaEntorno.texture;
    invalidate();

    return () => {
      if (scene.environment === mapaEntorno.texture) {
        scene.environment = entornoAnterior;
      }

      mapaEntorno.dispose();
      entorno.dispose();
      generadorEntorno.dispose();
    };
  }, [obtenerEscena]);

  return null;
}

function VisorTunel({
  className = "",
  vistaActiva = null,
  puntosInteres = [],
  puntoActivoId = "",
  onSeleccionarPunto = null,
  posicionCamaraInicial = VISTA.posicionCamaraInicial,
  objetivoCamaraInicial = VISTA.objetivoCamaraInicial,
  campoVision = VISTA.campoVision,
  distanciaMinima = VISTA.distanciaMinima,
  distanciaMaxima = VISTA.distanciaMaxima,
  zoomHabilitado = true,
  solicitudReinicio = 0,
  onCambioVistaAlterada = null,
  onInteraccionUsuario = null,
  anguloPolarMinimo = VISTA.anguloPolarMinimo,
  anguloPolarMaximo = VISTA.anguloPolarMaximo,
  velocidadRotacion = VISTA.velocidadRotacion,
  factorFrenado = VISTA.factorFrenado,
  dprLigeroMaximo = 1.1,
  rotacionModeloY = VISTA.rotacionModeloY,
  escalaModelo = VISTA.escalaModelo,
  desplazamientoModelo = VISTA.desplazamientoModelo,
  modoRendimiento = "normal",
  ocultarEtiquetasDuranteInteraccion = false,
}) {
  const controlesRef = useRef(null);
  const contenedorRef = useRef(null);
  const [interaccionActiva, setInteraccionActiva] = useState(false);
  const renderLigero = modoRendimiento === "ligero";
  const mostrarPuntosInteres = !ocultarEtiquetasDuranteInteraccion || !interaccionActiva;
  const marcarInicioInteraccion = useCallback(() => {
    if (ocultarEtiquetasDuranteInteraccion) {
      setInteraccionActiva(true);
    }
  }, [ocultarEtiquetasDuranteInteraccion]);
  const marcarFinInteraccion = useCallback(() => {
    if (ocultarEtiquetasDuranteInteraccion) {
      setInteraccionActiva(false);
    }
  }, [ocultarEtiquetasDuranteInteraccion]);
  useEffect(() => {
    const contenedor = contenedorRef.current;

    if (!contenedor) {
      return undefined;
    }

    function permitirMenuContextual(evento) {
      evento.stopImmediatePropagation();
    }

    contenedor.addEventListener("contextmenu", permitirMenuContextual, true);

    return () => {
      contenedor.removeEventListener("contextmenu", permitirMenuContextual, true);
    };
  }, []);

  return (
    <div ref={contenedorRef} className={`tunnel-viewer ${className}`.trim()}>
      <Visor3D
        camera={{ position: posicionCamaraInicial, fov: campoVision, near: 0.1, far: 100 }}
        ligero={renderLigero}
        dprMaximo={renderLigero ? dprLigeroMaximo : 1.5}
        descripcion="Modelo 3D del túnel de viento"
        controlesRef={controlesRef}
        controles={{
          enableZoom: zoomHabilitado,
          enableDamping: true,
          dampingFactor: factorFrenado,
          maxDistance: distanciaMaxima,
          minDistance: distanciaMinima,
          minPolarAngle: anguloPolarMinimo,
          maxPolarAngle: anguloPolarMaximo,
          rotateSpeed: velocidadRotacion,
        }}
      >
        <IluminacionLocal />
        <hemisphereLight args={["#ffffff", "#aebdcc", 1.35]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 5, 6]} intensity={2.4} />
        <directionalLight position={[-5, 3, -4]} intensity={1.1} />
        <directionalLight position={[0, -3, 5]} intensity={0.45} />
        <ControladorCamara
          vistaActiva={vistaActiva}
          controlesRef={controlesRef}
          posicionCamaraInicial={posicionCamaraInicial}
          objetivoCamaraInicial={objetivoCamaraInicial}
          distanciaMinima={distanciaMinima}
          distanciaMaxima={distanciaMaxima}
          solicitudReinicio={solicitudReinicio}
          onCambioVistaAlterada={onCambioVistaAlterada}
          onInicioInteraccion={marcarInicioInteraccion}
          onFinInteraccion={marcarFinInteraccion}
          onInteraccionUsuario={onInteraccionUsuario}
        />

        <Suspense fallback={null}>
          <ModeloTunel
            puntosInteres={puntosInteres}
            puntoActivoId={puntoActivoId}
            onSeleccionarPunto={onSeleccionarPunto}
            rotacionModeloY={rotacionModeloY}
            escalaModelo={escalaModelo}
            desplazamientoModelo={desplazamientoModelo}
            mostrarPuntosInteres={mostrarPuntosInteres}
          />
        </Suspense>
      </Visor3D>
    </div>
  );
}

export default memo(VisorTunel);
