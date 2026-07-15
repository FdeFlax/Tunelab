import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/pages.css";
import "./styles/dashboard2.css";
import "./styles/control2.css";
import "./styles/ensayos2.css";
import "./styles/registro2.css";
import "./styles/docente.css";
import "./styles/inspeccion.css";
import "./styles/lab-theme.css";
import "./styles/lab-light-theme.css";
import "./styles/componentes.css";

class ErrorBoundaryRaiz extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error renderizando la aplicacion:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "32px",
            display: "grid",
            placeItems: "center",
            background: "#09101b",
            color: "#edf4ff",
            fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              padding: "28px",
              borderRadius: "20px",
              background: "rgba(23, 34, 53, 0.92)",
              border: "1px solid rgba(141, 160, 188, 0.2)",
              boxShadow: "0 24px 48px rgba(3, 8, 17, 0.35)",
            }}
          >
            <p style={{ margin: "0 0 12px", color: "#4dc6ff", fontWeight: 700 }}>
              Error al cargar la app
            </p>
            <h1 style={{ margin: "0 0 16px", fontSize: "28px" }}>
              La interfaz se ha roto al renderizar
            </h1>
            <p style={{ margin: "0 0 18px", color: "#c7d4e8", lineHeight: 1.6 }}>
              Copiame este mensaje y lo arreglamos. Ya no deberia quedarse la pantalla
              completamente vacia.
            </p>
            <pre
              style={{
                margin: 0,
                padding: "16px",
                overflowX: "auto",
                borderRadius: "14px",
                background: "rgba(8, 15, 26, 0.88)",
                color: "#ffb4ac",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundaryRaiz>
    <App />
  </ErrorBoundaryRaiz>
);



