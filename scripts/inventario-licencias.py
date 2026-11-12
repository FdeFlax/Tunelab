"""Inventario local de metadatos y avisos; no sustituye la lectura de las licencias."""
import json
from collections import Counter
from datetime import date
from importlib.metadata import distributions
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
AVISOS = ("license", "licence", "copying", "notice", "copyright", "authors")


def relativo(ruta):
    return ruta.resolve().relative_to(RAIZ).as_posix()


def inventario_npm():
    lock = json.loads((RAIZ / "package-lock.json").read_text(encoding="utf-8"))
    principal = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
    resultado = []
    for ubicacion, datos in lock["packages"].items():
        if not ubicacion:
            continue
        carpeta = RAIZ / ubicacion
        manifiesto = carpeta / "package.json"
        paquete = json.loads(manifiesto.read_text(encoding="utf-8")) if manifiesto.exists() else {}
        nombre = datos.get("name") or paquete.get("name") or ubicacion.rsplit("node_modules/", 1)[-1]
        avisos = [relativo(p) for p in carpeta.glob("*")
                  if p.is_file() and p.name.lower().startswith(AVISOS)]
        resultado.append({"nombre": nombre, "version": datos.get("version"),
            "licencia": datos.get("license") or paquete.get("license") or paquete.get("licenses"),
            "directa": ubicacion == f"node_modules/{nombre}" and
                (nombre in principal.get("dependencies", {}) or nombre in principal.get("devDependencies", {})),
            "desarrollo": datos.get("dev", False), "opcional": datos.get("optional", False),
            "instalado": manifiesto.exists(), "ruta": ubicacion, "avisos": sorted(avisos)})
    return resultado


def inventario_python(entorno):
    base = RAIZ / entorno
    sitios = [base / "Lib/site-packages", *base.glob("lib/python*/site-packages")]
    resultado = []
    for paquete in distributions(path=[str(p) for p in sitios if p.is_dir()]):
        meta = paquete.metadata
        licencia = meta.get("License-Expression") or meta.get("License")
        resultado.append({"nombre": meta["Name"], "version": paquete.version,
            "licencia": licencia,
            "clasificadores": [v for v in meta.get_all("Classifier", []) if v.startswith("License ::")],
            "fuentes": meta.get_all("Project-URL", []) or [meta.get("Home-page")],
            "requiere": meta.get_all("Requires-Dist", []),
            "avisos": sorted(relativo(paquete.locate_file(p)) for p in paquete.files or []
                if p.name.lower().startswith(AVISOS) and paquete.locate_file(p).is_file())})
    return sorted(resultado, key=lambda p: p["nombre"].lower())


if __name__ == "__main__":
    datos = {"fecha": date.today().isoformat(), "npm": inventario_npm(),
        "python_api": inventario_python("backend/.venv"),
        "python_xlb": inventario_python("tmp/evaluacion-xlb/.venv")}
    salida = RAIZ / "docs/inventario_licencias.json"
    salida.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for entorno in ("npm", "python_api", "python_xlb"):
        paquetes = datos[entorno]
        print(entorno, len(paquetes))
        print(dict(Counter(str(p["licencia"])[:150] for p in paquetes)))
        print("Revisar:", [(p["nombre"], str(p["licencia"])[:150], p.get("clasificadores", []))
              for p in paquetes if not p["licencia"] or any(v in str(p["licencia"]).upper()
                  for v in ("GPL", "MPL", "SEE LICENSE", "CUSTOM"))])
