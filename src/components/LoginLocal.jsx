const USUARIOS_PRUEBA = [
  {
    id: "alu_demo",
    usuario: "alu_demo",
    nombre: "Alumno Demo",
    email: "alu_demo@alu.ua.es",
    rol: "alumno",
  },
  {
    id: "prof_demo",
    usuario: "prof_demo",
    nombre: "Profesor Demo",
    email: "prof_demo@ua.es",
    rol: "profesor",
  },
];

function LoginLocal({ onEntrar }) {
  return (
    <main className="loginlocal">
      <section className="loginlocalpanel">
        <span className="loginlocalmarca">Tunelab</span>
        <h1>Acceso de pruebas</h1>
        <p>
          Elige un perfil para probar la aplicacion. Cada ventana guarda su propia
          sesion, asi puedes tener un alumno y un docente abiertos a la vez.
        </p>

        <div className="loginlocalopciones">
          {USUARIOS_PRUEBA.map((usuario) => (
            <button
              className="loginlocaltarjeta"
              key={usuario.id}
              type="button"
              onClick={() => onEntrar(usuario)}
            >
              <span>{usuario.rol}</span>
              <strong>{usuario.nombre}</strong>
              <small>{usuario.email}</small>
            </button>
          ))}
        </div>

        <p className="loginlocalnota">
          En la version conectada a UACloud, este paso lo hara eServices y la app
          recibira automaticamente el usuario real.
        </p>
      </section>
    </main>
  );
}

export default LoginLocal;
