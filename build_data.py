"""
build_data.py — Tablero ETDH · Técnicos Laborales · UNIMINUTO Sede Tolima-Huila
Genera data.json (agregado, sin datos personales) a partir del export SAP.

Uso:
    python build_data.py                      # usa el Excel por defecto
    python build_data.py otro_archivo.xlsx

Columnas esperadas en la primera hoja: Año | Programa | Ingresos | Estudiantes
"""
import json, sys
from datetime import date
import pandas as pd

EXCEL = sys.argv[1] if len(sys.argv) > 1 else "Histórico_Técnicos_Laborales_UNIMINUTO.xlsx"

# Nombre abreviado SAP -> (nombre legible, tipo de programa)
# Si SAP trae un nombre nuevo, agréguelo aquí. Los no mapeados se muestran tal cual.
NOMBRES = {
    "Tl Atencion Primera":  ("Atención a la Primera Infancia", "Técnico laboral"),
    "Tl Comp Ate Pri Inf":  ("Atención a la Primera Infancia", "Técnico laboral"),
    "Tl Aux Servicios Fro": ("Auxiliar en Servicios Fro.", "Técnico laboral"),
    "Tl Comp Conta Fin":    ("Contable y Financiero", "Técnico laboral"),
    "Tl Comp Gest Adminis": ("Gestión Administrativa", "Técnico laboral"),
    "Tl Comp Mer P Vta":    ("Mercadeo y Punto de Venta", "Técnico laboral"),
    "Tl Compe Mant Motos":  ("Mantenimiento de Motocicletas", "Técnico laboral"),
    "Tl Gest. Ambi":        ("Gestión Ambiental", "Técnico laboral"),
    "Tl Gestion Turistica": ("Gestión Turística", "Técnico laboral"),
    "Tl Comp Aux Alm Y Bo": ("Auxiliar de Almacén y Bodega", "Técnico laboral"),
    "Tl Compe Seg Y Salud": ("Seguridad y Salud en el Trabajo", "Técnico laboral"),
    "Tl Diseño Gra":        ("Diseño Gráfico", "Técnico laboral"),
    "Tl Comp Conf Industr": ("Confección Industrial", "Técnico laboral"),
    "Fa Ingles Nivel A1":   ("Inglés Nivel A1", "Idiomas"),
    "Fa Ingles Nivel B2":   ("Inglés Nivel B2", "Idiomas"),
}

def mapear(sap):
    sap = str(sap).strip()
    if sap in NOMBRES:
        return NOMBRES[sap]
    tipo = "Idiomas" if sap.lower().startswith("fa ") else "Técnico laboral"
    return (sap, tipo)

df = pd.read_excel(EXCEL)
df.columns = [str(c).strip() for c in df.columns]
df = df.rename(columns={"Año": "anio", "Programa": "sap", "Ingresos": "ingresos", "Estudiantes": "estudiantes"})
df = df.dropna(subset=["anio", "sap"])
df["anio"] = df["anio"].astype(int)
df["ingresos"] = pd.to_numeric(df["ingresos"], errors="coerce").fillna(0)
df["estudiantes"] = pd.to_numeric(df["estudiantes"], errors="coerce").fillna(0).astype(int)
df["programa"] = df["sap"].map(lambda s: mapear(s)[0])
df["tipo"] = df["sap"].map(lambda s: mapear(s)[1])

# Agregar (une filas repetidas del mismo programa/año y códigos SAP equivalentes)
agg = (df.groupby(["anio", "programa"], as_index=False)
         .agg(ingresos=("ingresos", "sum"), estudiantes=("estudiantes", "sum")))

programas = []
for nombre, g in df.groupby("programa"):
    programas.append({
        "nombre": nombre,
        "tipo": g["tipo"].iloc[0],
        "nombres_sap": sorted(g["sap"].astype(str).str.strip().unique().tolist()),
    })

data = {
    "meta": {
        "titulo": "ETDH · Técnicos Laborales",
        "sede": "UNIMINUTO Sede Tolima-Huila",
        "fuente": "SAP UNIMINUTO · Histórico de Técnicos Laborales",
        "generado": date.today().isoformat(),
    },
    "programas": programas,
    "registros": [
        {"anio": int(r.anio), "programa": r.programa,
         "ingresos": round(float(r.ingresos), 2), "estudiantes": int(r.estudiantes)}
        for r in agg.itertuples()
    ],
}

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print(f"data.json generado: {len(data['registros'])} registros · {len(programas)} programas · "
      f"años {agg.anio.min()}–{agg.anio.max()}")
