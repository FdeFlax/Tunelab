import { Bolt, CirclePlus, House, Info, Menu, NotepadText, SquareArrowRightEnter, User, UserStar, Wind } from "lucide-react";
import { AERODINAMICA_VISIBLE } from "../../funcionalidades";

function BarraLateral({
  paginaActual,
  cambiarPagina,
  barraAbierta,
  cambiarBarraAbierta,
  usuarioActual,
  onLogout,
}) {
  function enlaceActivo(id) {
    return paginaActual === id;
  }

  const accesosPrincipales = [
    { id: "ensayos", label: "Ensayo", icon: CirclePlus, variante: "ensayo" },
    { id: "dashboard", label: "Dashboard", icon: House },
    { id: "inspeccion", label: "Inspección", icon: Info },
    { id: "control", label: "Control", icon: Bolt },
    { id: "registro", label: "Registro", icon: NotepadText },
    ...(AERODINAMICA_VISIBLE ? [{ id: "aerodinamica", label: "Aerodinámica", icon: Wind }] : []),
    { id: "docente", label: "Docente", icon: UserStar },
  ];

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
          <Menu size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <div className="sidebar-brand" aria-hidden={!barraAbierta}>
          <strong>Menú</strong>
        </div>
      </div>

      <nav className="sidebar-nav">
        {accesosPrincipales.filter((item) => item.id !== "docente" || esDocente).map((item) => {
          const Icono = item.icon;

          return (
            <button
              key={item.id}
              className={`sidelink ${enlaceActivo(item.id) ? "sidelinkactive" : ""}`}
              onClick={() => cambiarPagina(item.id)}
              aria-label={item.label}
              aria-current={enlaceActivo(item.id) ? "page" : undefined}
              title={barraAbierta ? undefined : item.label}
            >
              <span
                className={`sidelinkicon ${item.variante ? `sidelinkicon--${item.variante}` : ""}`}
              >
                <Icono size={18} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="sidelinklabel" aria-hidden={!barraAbierta}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sideuser sideuserreadonly">
          <span className="sideusericon">
            <User size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="sideuserinline" aria-hidden={!barraAbierta}>
            <strong>{usuarioActual?.nombre || "Usuario"}</strong>
            <small>{usuarioActual?.rol || "Perfil"}</small>
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
          title="Cerrar sesión"
        >
          <span className="sidelinkicon">
            <SquareArrowRightEnter size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="sideactionlabel" aria-hidden={!barraAbierta}>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default BarraLateral;
