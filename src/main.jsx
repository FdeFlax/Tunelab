import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QueryClientProvider } from "@tanstack/react-query";
import { consultasApi } from "./servicios/api/clienteApi";
import "./styles/index.css";

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
            background: "#eef3f7",
            color: "#162235",
            fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              padding: "28px",
              borderRadius: "var(--tarjeta-radio)",
              background: "#ffffff",
              border: "1px solid #c8d3df",
              boxShadow: "0 16px 44px rgba(58, 76, 96, 0.1)",
            }}
          >
            <p style={{ margin: "0 0 12px", color: "#003e69", fontWeight: 700 }}>
              Error al cargar la app
            </p>
            <h1 style={{ margin: "0 0 16px", fontSize: "28px" }}>
              La interfaz se ha roto al renderizar
            </h1>
            <p style={{ margin: "0 0 18px", color: "#5b6b7e", lineHeight: 1.6 }}>
              Copiame este mensaje y lo arreglamos. Ya no deberia quedarse la pantalla
              completamente vacia.
            </p>
            <pre
              style={{
                margin: 0,
                padding: "16px",
                overflowX: "auto",
                borderRadius: "var(--control-radio)",
                background: "#f6f9fb",
                color: "#8d2e35",
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
    <QueryClientProvider client={consultasApi}><App /></QueryClientProvider>
  </ErrorBoundaryRaiz>
);



