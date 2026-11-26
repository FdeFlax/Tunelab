import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useBounds } from '@react-three/drei';
import { Vector3 } from 'three';

export default function ControladorCamara({
  vistaActiva, controlesRef, posicionCamaraInicial, objetivoCamaraInicial,
  distanciaMinima, distanciaMaxima, solicitudReinicio = 0,
  onCambioVistaAlterada, onInicioInteraccion, onFinInteraccion, onInteraccionUsuario,
}) {
  const { camera, controls, invalidate } = useThree();
  const bounds = useBounds();
  const vistaAlterada = useRef(false);
  const camaraInicializada = useRef(null);
  const posicion = vistaActiva?.camara || posicionCamaraInicial;
  const objetivo = vistaActiva?.objetivo || objetivoCamaraInicial;

  useEffect(() => {
    if (!controls) return;
    const centro = new Vector3(...objetivo);
    const direccion = new Vector3(...posicion).sub(centro);
    if (direccion.lengthSq() >= 0.0001) direccion.clampLength(distanciaMinima, distanciaMaxima);
    const destino = centro.clone().add(direccion);
    if (camaraInicializada.current !== camera) {
      // Al abrir la página, cámara y controles parten de la misma vista.
      camera.up.set(0, 1, 0);
      camera.position.copy(destino);
      controls.target.copy(centro);
      controls.update();
      camaraInicializada.current = camera;
    } else {
      bounds.refresh().moveTo(destino).lookAt({ target: objetivo, up: [0, 1, 0] });
    }
    invalidate();
  }, [camera, controls, bounds, posicion, objetivo, solicitudReinicio, distanciaMinima, distanciaMaxima, invalidate]);

  useEffect(() => {
    const controles = controlesRef.current;
    if (!controles) return;
    const inicioCamara = new Vector3(...posicionCamaraInicial);
    const inicioObjetivo = new Vector3(...objetivoCamaraInicial);
    function actualizar() {
      const alterada = camera.position.distanceTo(inicioCamara) > 0.12 || controles.target.distanceTo(inicioObjetivo) > 0.12;
      if (alterada !== vistaAlterada.current) {
        vistaAlterada.current = alterada;
        onCambioVistaAlterada?.(alterada);
      }
    }
    const empezar = () => onInicioInteraccion?.();
    const terminar = () => { onFinInteraccion?.(); onInteraccionUsuario?.(); actualizar(); };
    controles.addEventListener('start', empezar);
    controles.addEventListener('end', terminar);
    controles.addEventListener('change', actualizar);
    return () => {
      controles.removeEventListener('start', empezar);
      controles.removeEventListener('end', terminar);
      controles.removeEventListener('change', actualizar);
    };
  }, [camera, controlesRef, bounds, posicionCamaraInicial, objetivoCamaraInicial,
    onCambioVistaAlterada, onInicioInteraccion, onFinInteraccion, onInteraccionUsuario]);

  useEffect(() => () => onCambioVistaAlterada?.(false), [onCambioVistaAlterada]);
  return null;
}
