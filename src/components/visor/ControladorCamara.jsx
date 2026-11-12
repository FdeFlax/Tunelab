import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

function limitarPosicionCamara(camara, objetivo, distanciaMinima, distanciaMaxima) {
  const vectorCamara = new Vector3(...camara);
  const vectorObjetivo = new Vector3(...objetivo);
  const direccion = vectorCamara.sub(vectorObjetivo);

  if (direccion.lengthSq() < 0.0001) {
    return [...camara];
  }

  // El destino debe ser alcanzable por OrbitControls para que la animación termine.
  direccion.setLength(Math.max(distanciaMinima, Math.min(distanciaMaxima, direccion.length())));
  return vectorObjetivo.add(direccion).toArray();
}

export default function ControladorCamara({
  vistaActiva,
  controlesRef,
  posicionCamaraInicial,
  objetivoCamaraInicial,
  distanciaMinima,
  distanciaMaxima,
  solicitudReinicio = 0,
  onCambioVistaAlterada = null,
  onInicioInteraccion = null,
  onFinInteraccion = null,
  onInteraccionUsuario = null,
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
  const animando = useRef(true);
  const vistaAlteradaAnterior = useRef(false);

  const actualizarEstadoVistaAlterada = useCallback(() => {
    if (!onCambioVistaAlterada) {
      return;
    }

    const distanciaCamaraInicio = camera.position.distanceTo(posicionInicio.current);
    const distanciaObjetivoInicio = controlesRef.current
      ? controlesRef.current.target.distanceTo(objetivoInicio.current)
      : 0;
    const vistaAlterada = distanciaCamaraInicio > 0.12 || distanciaObjetivoInicio > 0.12;

    if (vistaAlterada !== vistaAlteradaAnterior.current) {
      vistaAlteradaAnterior.current = vistaAlterada;
      onCambioVistaAlterada(vistaAlterada);
    }
  }, [camera, controlesRef, onCambioVistaAlterada]);

  useEffect(() => {
    posicionInicio.current.set(posicionInicialX, posicionInicialY, posicionInicialZ);
    objetivoInicio.current.set(objetivoInicialX, objetivoInicialY, objetivoInicialZ);
    const posicion = limitarPosicionCamara(
      [camaraDestinoX, camaraDestinoY, camaraDestinoZ],
      [objetivoDestinoX, objetivoDestinoY, objetivoDestinoZ],
      distanciaMinima,
      distanciaMaxima
    );

    destinoCamara.current.set(...posicion);
    destinoObjetivo.current.set(objetivoDestinoX, objetivoDestinoY, objetivoDestinoZ);
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
    distanciaMinima,
    distanciaMaxima,
    invalidate,
  ]);

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
        actualizarEstadoVistaAlterada();
      } else {
        invalidate();
      }
    }
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
      onInicioInteraccion?.();

      if (!animando.current) {
        invalidate();
        return;
      }

      animando.current = false;
      destinoObjetivo.current.copy(controles.target);
      controles.update();
      invalidate();
    }

    function invalidarDuranteInteraccion() {
      invalidate();
    }

    function finalizarInteraccion() {
      onFinInteraccion?.();
      onInteraccionUsuario?.();
      invalidate();
      actualizarEstadoVistaAlterada();
    }

    controles.addEventListener("start", cancelarAnimacionPorInteraccion);
    controles.addEventListener("change", invalidarDuranteInteraccion);
    controles.addEventListener("end", finalizarInteraccion);

    return () => {
      controles.removeEventListener("start", cancelarAnimacionPorInteraccion);
      controles.removeEventListener("change", invalidarDuranteInteraccion);
      controles.removeEventListener("end", finalizarInteraccion);
    };
  }, [actualizarEstadoVistaAlterada, controlesRef, invalidate, onFinInteraccion, onInicioInteraccion, onInteraccionUsuario]);

  return null;
}

