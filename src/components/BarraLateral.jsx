import { Bolt, CirclePlus, House, Info, Menu, NotepadText, UserStar } from "lucide-react";
function BarraLateral({
  paginaActual,
  cambiarPagina,
  barraAbierta,
  cambiarBarraAbierta,
  usuarioActual,
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

  const inicialUsuario = usuarioActual?.nombre?.slice(0, 1)?.toUpperCase() || "U";
  const esDocente = ["profesor", "tecnico", "admin"].includes(usuarioActual?.rol);

  return (
    <aside className={`sidebar ${barraAbierta ? "sidebar--open" : "sidebar--collapsed"}`}>
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-logo sidebar-menu"
          onClick={() => cambiarBarraAbierta(!barraAbierta)}
          aria-label={barraAbierta ? "Colapsar barra lateral" : "Abrir barra lateral"}
        >
          <Menu size={24} strokeWidth={2.2} aria-hidden="true" />
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
                <Icono size={22} strokeWidth={2.2} aria-hidden="true" />
              </span>
              {barraAbierta && <span className="sidelinklabel">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sideuser sideuserreadonly">
          <span className="sideusericon">{inicialUsuario}</span>
          {barraAbierta && (
            <span className="sideusercopy">
              <span className="sideusername">{usuarioActual?.nombre || "Usuario"}</span>
              <span className="sideuserrole">{usuarioActual?.perfil || "Perfil"}</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

export default BarraLateral;





