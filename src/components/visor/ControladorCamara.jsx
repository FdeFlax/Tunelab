import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useBounds } from '@react-three/drei';
import { Vector3 } from 'three';

export default function ControladorCamara({
  vistaActiva, controlesRef, posicionCamaraInicial, objetivoCamaraInicial,
  distanciaMinima, distanciaMaxima, solicitudReinicio = 0,
  onCambioVistaAlterada, onInicioInteraccion, onFinInteraccion, onInteraccionUsuario,
}) {
  const { camera, invalidate } = useThree();
  const bounds = useBounds();
  const vistaAlterada = useRef(false);
  const posicion = vistaActiva?.camara || posicionCamaraInicial;
  const objetivo = vistaActiva?.objetivo || objetivoCamaraInicial;

  useEffect(() => {
    const centro = new Vector3(...objetivo);
    const direccion = new Vector3(...posicion).sub(centro);
    if (direccion.lengthSq() >= 0.0001) direccion.clampLength(distanciaMinima, distanciaMaxima);
    bounds.refresh().moveTo(centro.add(direccion)).lookAt({ target: objetivo });
    invalidate();
  }, [bounds, posicion, objetivo, solicitudReinicio, distanciaMinima, distanciaMaxima, invalidate]);

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
