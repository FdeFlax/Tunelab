import { Component, lazy, Suspense } from 'react';

const cargarLaboratorio = () => lazy(() => import('../aerodinamica/Laboratorio.jsx'));

class CargaLaboratorio extends Component {
  state = { error: false, Laboratorio: cargarLaboratorio() };
  static getDerivedStateFromError() { return { error: true }; }

  render() {
    if (this.state.error) return <div role="alert">
      <p>No se ha podido cargar Aerodinámica.</p>
      <button type="button" onClick={() => this.setState({ error: false, Laboratorio: cargarLaboratorio() })}>Volver a intentar</button>
    </div>;
    const Laboratorio = this.state.Laboratorio;
    return <Suspense fallback={<p role="status">Cargando Aerodinámica…</p>}><Laboratorio /></Suspense>;
  }
}

export default function PaginaAerodinamica() {
  return <section aria-label="Laboratorio de aerodinámica" className="aerodinamica-lab"><CargaLaboratorio /></section>;
}
