import { memo, Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Vector3 } from "three";

const POSICION_CAMARA_INICIAL = [5.8, 1.9, 8.2];
const OBJETIVO_CAMARA_INICIAL = [0, 0.2, 0];

function calcularFactorZoom(nivelZoom) {
  return 1.5 - nivelZoom * 0.01;
}

function calcularPosicionConZoom(camara, objetivo, nivelZoom) {
  const vectorCamara = new Vector3(...camara);
  const vectorObjetivo = new Vector3(...objetivo);
  const direccion = vectorCamara.sub(vectorObjetivo);

  if (direccion.lengthSq() < 0.0001) {
    return [...camara];
  }

  direccion.multiplyScalar(calcularFactorZoom(nivelZoom));
  return vectorObjetivo.add(direccion).toArray();
}

function ControladorCamara({
  vistaActiva,
  controlesRef,
  posicionCamaraInicial,
  objetivoCamaraInicial,
  nivelZoom = 50,
  solicitudReinicio = 0,
  onCambioVistaAlterada = null,
}) {
  const { camera, invalidate } = useThree();
  const [posicionInicialX, posicionInicialY, posicionInicialZ] = posicionCamaraInicial;
  const [objetivoInicialX, objetivoInicialY, objetivoInicialZ] = objetivoCamaraInicial;
  const camaraDestino = vistaActiva?.camara || posicionCamaraInicial;
  const objetivoDestino = vistaActiva?.objetivo || objetivoCamaraInicial;
  const [camaraDestinoX, camaraDestinoY, camaraDestinoZ] = camaraDestino;
  const [objetivoDestinoX, objetivoDestinoY, objetivoDestinoZ] = objetivoDestino;
  const posicionInicio = useRef(new Vector3(...posicionCamaraInicial));
  const objetivoInicio = useRef(new Vector3(...objetivoCamaraInicial));
  const destinoCamara = useRef(new Vector3(...posicionCamaraInicial));
  const destinoObjetivo = useRef(new Vector3(...objetivoCamaraInicial));
  const camaraBase = useRef([...posicionCamaraInicial]);
  const objetivoBase = useRef([...objetivoCamaraInicial]);
  const animando = useRef(true);
  const vistaAlteradaAnterior = useRef(false);
  const nivelZoomAnterior = useRef(nivelZoom);
  const nivelZoomActual = useRef(nivelZoom);

  const actualizarEstadoVistaAlterada = useCallback(() => {
    const distanciaCamaraInicio = camera.position.distanceTo(posicionInicio.current);
    const distanciaObjetivoInicio = controlesRef.current
      ? controlesRef.current.target.distanceTo(objetivoInicio.current)
      : 0;
    const vistaAlterada = distanciaCamaraInicio > 0.12 || distanciaObjetivoInicio > 0.12;

    if (vistaAlterada !== vistaAlteradaAnterior.current) {
      vistaAlteradaAnterior.current = vistaAlterada;
      onCambioVistaAlterada?.(vistaAlterada);
    }
  }, [camera, controlesRef, onCambioVistaAlterada]);

  useEffect(() => {
    nivelZoomActual.current = nivelZoom;
  }, [nivelZoom]);

  useEffect(() => {
    posicionInicio.current.set(posicionInicialX, posicionInicialY, posicionInicialZ);
    objetivoInicio.current.set(objetivoInicialX, objetivoInicialY, objetivoInicialZ);
    camaraBase.current = [camaraDestinoX, camaraDestinoY, camaraDestinoZ];
    objetivoBase.current = [objetivoDestinoX, objetivoDestinoY, objetivoDestinoZ];

    const posicionZoom = calcularPosicionConZoom(
      camaraBase.current,
      objetivoBase.current,
      nivelZoomActual.current
    );

    destinoCamara.current.set(...posicionZoom);
    destinoObjetivo.current.set(...objetivoBase.current);
    animando.current = true;
    invalidate();
  }, [
    camaraDestinoX,
    camaraDestinoY,
    camaraDestinoZ,
    objetivoDestinoX,
    objetivoDestinoY,
    objetivoDestinoZ,
    objetivoInicialX,
    objetivoInicialY,
    objetivoInicialZ,
    posicionInicialX,
    posicionInicialY,
    posicionInicialZ,
    solicitudReinicio,
    invalidate,
  ]);

  useEffect(() => {
    if (nivelZoomAnterior.current === nivelZoom) {
      return;
    }

    nivelZoomAnterior.current = nivelZoom;

    const objetivoZoom = new Vector3(...objetivoBase.current);
    const direccionActual = controlesRef.current
      ? camera.position.clone().sub(controlesRef.current.target)
      : camera.position.clone().sub(objetivoZoom);

    if (direccionActual.lengthSq() < 0.0001) {
      direccionActual.set(
        camaraBase.current[0] - objetivoBase.current[0],
        camaraBase.current[1] - objetivoBase.current[1],
        camaraBase.current[2] - objetivoBase.current[2]
      );
    }

    direccionActual.normalize();

    const distanciaBase = new Vector3(...camaraBase.current).distanceTo(objetivoZoom);
    const distanciaZoom = distanciaBase * calcularFactorZoom(nivelZoom);
    const posicionZoom = objetivoZoom.clone().addScaledVector(direccionActual, distanciaZoom);

    destinoCamara.current.copy(posicionZoom);
    destinoObjetivo.current.copy(objetivoZoom);
    animando.current = true;
    invalidate();
  }, [camera, controlesRef, invalidate, nivelZoom]);

  useFrame(() => {
    if (animando.current) {
      camera.position.lerp(destinoCamara.current, 0.08);

      if (controlesRef.current) {
        controlesRef.current.target.lerp(destinoObjetivo.current, 0.08);
        controlesRef.current.update();
      } else {
        camera.lookAt(destinoObjetivo.current);
      }

      const objetivoAlcanzado =
        camera.position.distanceTo(destinoCamara.current) < 0.04 &&
        (!controlesRef.current ||
          controlesRef.current.target.distanceTo(destinoObjetivo.current) < 0.04);

      if (objetivoAlcanzado) {
        camera.position.copy(destinoCamara.current);

        if (controlesRef.current) {
          controlesRef.current.target.copy(destinoObjetivo.current);
          controlesRef.current.update();
        }

        animando.current = false;
      } else {
        invalidate();
      }
    }

    actualizarEstadoVistaAlterada();
  });

  useEffect(() => {
    return () => {
      if (vistaAlteradaAnterior.current) {
        onCambioVistaAlterada?.(false);
      }
    };
  }, [onCambioVistaAlterada]);

  useEffect(() => {
    const controles = controlesRef.current;

    if (!controles) {
      return undefined;
    }

    function cancelarAnimacionPorInteraccion() {
      if (!animando.current) {
        invalidate();
        actualizarEstadoVistaAlterada();
        return;
      }

      animando.current = false;
      controles.target.copy(destinoObjetivo.current);
      controles.update();
      invalidate();
      actualizarEstadoVistaAlterada();
    }

    function invalidarDuranteInteraccion() {
      invalidate();
      actualizarEstadoVistaAlterada();
    }

    controles.addEventListener("start", cancelarAnimacionPorInteraccion);
    controles.addEventListener("change", invalidarDuranteInteraccion);
    controles.addEventListener("end", invalidarDuranteInteraccion);

    return () => {
      controles.removeEventListener("start", cancelarAnimacionPorInteraccion);
      controles.removeEventListener("change", invalidarDuranteInteraccion);
      controles.removeEventListener("end", invalidarDuranteInteraccion);
    };
  }, [actualizarEstadoVistaAlterada, controlesRef, invalidate]);

  return null;
}

function PuntosInteres({ puntos, puntoActivoId, onSeleccionarPunto }) {
  return puntos.map((punto) => (
    <Html key={punto.id} position={punto.posicion} distanceFactor={5}>
      <div className="visorpuntowrapper">
        <button
          type="button"
          className={`visorpuntoboton ${
            puntoActivoId === punto.id ? "visorpuntobotonactivo" : ""
          }`}
          style={{
            "--desplazamiento-etiqueta-x": punto.desplazamientoEtiqueta?.x || "0px",
            "--desplazamiento-etiqueta-y": punto.desplazamientoEtiqueta?.y || "0px",
          }}
          onClick={(evento) => {
            evento.stopPropagation();
            onSeleccionarPunto?.(punto.id);
          }}
        >
          <span className="visorpuntoicono" aria-hidden="true" />
          <span>{punto.etiqueta}</span>
        </button>
      </div>
    </Html>
  ));
}

function ModeloTunel({
  puntosInteres,
  puntoActivoId,
  onSeleccionarPunto,
  rotacionModeloY = -0.35,
}) {
  const { scene } = useGLTF("/models/tfg.glb");

  return (
    <group position={[0, -0.55, 0]} rotation={[0, rotacionModeloY, 0]} scale={1.15}>
      <primitive object={scene} />
      {puntosInteres?.length ? (
        <PuntosInteres
          puntos={puntosInteres}
          puntoActivoId={puntoActivoId}
          onSeleccionarPunto={onSeleccionarPunto}
        />
      ) : null}
    </group>
  );
}

function VisorTunel({
  className = "",
  vistaActiva = null,
  puntosInteres = [],
  puntoActivoId = "",
  onSeleccionarPunto = null,
  posicionCamaraInicial = POSICION_CAMARA_INICIAL,
  objetivoCamaraInicial = OBJETIVO_CAMARA_INICIAL,
  campoVision = 34,
  distanciaMinima = 4.5,
  distanciaMaxima = 11,
  nivelZoom = 50,
  zoomHabilitado = true,
  solicitudReinicio = 0,
  onCambioVistaAlterada = null,
  anguloPolarMinimo = 0.85,
  anguloPolarMaximo = 1.6,
  velocidadRotacion = 0.85,
  rotacionModeloY = -0.35,
  modoRendimiento = "normal",
}) {
  const controlesRef = useRef(null);
  const contenedorRef = useRef(null);
  const renderLigero = modoRendimiento === "ligero";


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
      <Canvas
        camera={{ position: posicionCamaraInicial, fov: campoVision }}
        frameloop={renderLigero ? "demand" : "always"}
        dpr={renderLigero ? [1, 1.1] : [1, 1.5]}
        gl={{
          antialias: !renderLigero,
          alpha: true,
          powerPreference: renderLigero ? "low-power" : "high-performance",
          preserveDrawingBuffer: false,
          stencil: false,
        }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[6, 4, 5]} intensity={1.9} />
        <directionalLight position={[-4, 2, -3]} intensity={0.7} />
        <ControladorCamara
          vistaActiva={vistaActiva}
          controlesRef={controlesRef}
          posicionCamaraInicial={posicionCamaraInicial}
          objetivoCamaraInicial={objetivoCamaraInicial}
          nivelZoom={nivelZoom}
          solicitudReinicio={solicitudReinicio}
          onCambioVistaAlterada={onCambioVistaAlterada}
        />

        <Suspense fallback={null}>
          <ModeloTunel
            puntosInteres={puntosInteres}
            puntoActivoId={puntoActivoId}
            onSeleccionarPunto={onSeleccionarPunto}
            rotacionModeloY={rotacionModeloY}
          />
          <Environment preset="studio" resolution={renderLigero ? 64 : 256} />
        </Suspense>

        <OrbitControls
          ref={controlesRef}
          enablePan={false}
          enableZoom={zoomHabilitado}
          enableDamping
          dampingFactor={0.08}
          maxDistance={distanciaMaxima}
          minDistance={distanciaMinima}
          minPolarAngle={anguloPolarMinimo}
          maxPolarAngle={anguloPolarMaximo}
          rotateSpeed={velocidadRotacion}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/tfg.glb");

export default memo(VisorTunel);



