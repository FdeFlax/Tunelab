import { Bolt, CirclePlus, House, Info, Menu, Moon, NotepadText, SquareArrowRightEnter, Sun, User, UserStar } from "lucide-react";

function BarraLateral({
  paginaActual,
  cambiarPagina,
  barraAbierta,
  cambiarBarraAbierta,
  usuarioActual,
  temaClaro,
  onCambiarTema,
  onLogout,
}) {
  function enlaceActivo(id) {
    return paginaActual === id;
  }

  const accesosPrincipales = [
    { id: "ensayos", label: "Ensayo", icon: CirclePlus, variante: "ensayo" },
    { id: "dashboard", label: "Dashboard", icon: House },
    { id: "inspeccion", label: "Inspeccion", icon: Info },
    { id: "control", label: "Control", icon: Bolt },
    { id: "registro", label: "Registro", icon: NotepadText },
    { id: "docente", label: "Docente", icon: UserStar },
  ];

  const esDocente = ["profesor", "tecnico", "admin"].includes(usuarioActual?.rol);
  const IconoTema = temaClaro ? Moon : Sun;
  const textoTema = temaClaro ? "Modo oscuro" : "Modo claro";

  return (
    <aside className={`sidebar ${barraAbierta ? "sidebar--open" : "sidebar--collapsed"}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-logo sidebar-menu"
          onClick={() => cambiarBarraAbierta(!barraAbierta)}
          aria-label={barraAbierta ? "Colapsar barra lateral" : "Abrir barra lateral"}
        >
          <Menu size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar-nav">
        {accesosPrincipales.filter((item) => item.id !== "docente" || esDocente).map((item) => {
          const Icono = item.icon;

          return (
            <button
              key={item.id}
              className={`sidelink ${enlaceActivo(item.id) ? "sidelinkactive" : ""}`}
              onClick={() => cambiarPagina(item.id)}
            >
              <span
                className={`sidelinkicon ${item.variante ? `sidelinkicon--${item.variante}` : ""}`}
              >
                <Icono size={18} strokeWidth={2.2} aria-hidden="true" />
              </span>
              {barraAbierta && <span className="sidelinklabel">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sideactions" aria-label="Acciones de usuario">
          <button
            type="button"
            className="sideactionbtn"
            onClick={onCambiarTema}
            aria-label={textoTema}
            title={textoTema}
          >
            <span className="sidelinkicon">
              <IconoTema size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </button>
        </div>

        <div className="sideuser sideuserreadonly">
          <span className="sideusericon">
            <User size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="sideuserpopover" role="status">
            <span className="sideusername">{usuarioActual?.nombre || "Usuario"}</span>
            <span className="sideuseremail">{usuarioActual?.email || usuarioActual?.usuario || "Sin correo"}</span>
            <span className="sideuserrole">{usuarioActual?.perfil || usuarioActual?.rol || "Perfil"}</span>
          </span>
        </div>

        <button
          type="button"
          className="sideactionbtn sideactionbtnsalir"
          onClick={onLogout}
          aria-label="Salir"
          title="Salir"
        >
          <span className="sidelinkicon">
            <SquareArrowRightEnter size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </button>
      </div>
    </aside>
  );
}

export default BarraLateral;