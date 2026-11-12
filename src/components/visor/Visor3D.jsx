import { Component, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';

class LimiteVisor extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <p role="status">Vista 3D no disponible en este navegador.</p> : this.props.children;
  }
}

function ControlesCamara({ referencia, opciones }) {
  const { camera, gl, invalidate } = useThree();
  const controles = useMemo(() => new OrbitControls(camera), [camera]);
  useEffect(() => {
    const actualizar = () => invalidate();
    controles.connect(gl.domElement);
    controles.addEventListener('change', actualizar);
    return () => {
      controles.removeEventListener('change', actualizar);
      controles.dispose();
    };
  }, [controles, gl, invalidate]);
  useFrame(() => {
    if (controles.enabled) controles.update();
  }, -1);
  return <primitive object={controles} ref={referencia} enablePan={false} enableDamping {...opciones} />;
}

function AccesoCamara({ controlesRef, descripcion, permitirGiro }) {
  const obtenerEscena = useThree(state => state.get);
  useEffect(() => {
    const { gl } = obtenerEscena();
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', descripcion);
    canvas.title = permitirGiro
      ? 'Arrastra para girar la cámara · Mayús y flechas para girar con teclado · Rueda para acercar'
      : 'Vista fija · Rueda para acercar';
    function girar(evento) {
      const controles = controlesRef.current;
      if (!controles?.enabled || !controles.enableRotate || !evento.shiftKey) return;
      const pasos = { ArrowLeft: [0.08, 0], ArrowRight: [-0.08, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] };
      const paso = pasos[evento.key];
      if (!paso) return;
      evento.preventDefault();
      controles.dispatchEvent({ type: 'start' });
      if (paso[0]) controles.rotateLeft(-paso[0]);
      if (paso[1]) controles.rotateUp(-paso[1]);
      controles.dispatchEvent({ type: 'end' });
    }
    canvas.addEventListener('keydown', girar);
    return () => canvas.removeEventListener('keydown', girar);
  }, [obtenerEscena, controlesRef, descripcion, permitirGiro]);
  return null;
}

export default function Visor3D({ camera, controlesRef, controles = {}, ligero = true, dprMaximo = 1.5, gl = {}, descripcion = 'Modelo 3D interactivo', children }) {
  const controlesInternos = useRef(null);
  const referencia = controlesRef || controlesInternos;
  return (
    <LimiteVisor>
      <Canvas
        camera={camera}
        frameloop={ligero ? 'demand' : 'always'}
        dpr={[1, dprMaximo]}
        fallback={<p>Vista 3D no disponible en este navegador.</p>}
        gl={{ outputColorSpace: SRGBColorSpace, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.2,
          antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: false, ...gl }}
      >
        {children}
        <ControlesCamara referencia={referencia} opciones={controles} />
        <AccesoCamara controlesRef={referencia} descripcion={descripcion} permitirGiro={controles.enableRotate !== false} />
      </Canvas>
    </LimiteVisor>
  );
}
