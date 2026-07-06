import { Moon, SquareArrowRightEnter, Sun } from "lucide-react";

function BarraSuperior({ onLogout, temaClaro, onCambiarTema }) {
  const IconoTema = temaClaro ? Moon : Sun;
  const textoTema = temaClaro ? "Modo oscuro" : "Modo claro";

  return (
    <header className="barsup barsupsimple">
      <div className="barsupacciones">
        <button
          className="barsupiconbtn barsuptema"
          onClick={onCambiarTema}
          type="button"
          aria-label={textoTema}
          title={textoTema}
        >
          <IconoTema size={22} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button
          className="barsupiconbtn barsupsalir"
          onClick={onLogout}
          type="button"
          aria-label="Salir"
          title="Salir"
        >
          <SquareArrowRightEnter size={23} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export default BarraSuperior;
