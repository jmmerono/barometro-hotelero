"""
ingest_ine.py — Descarga datos EOH del INE y los sube a Firebase Firestore
Corre en GitHub Actions cada mes. También se puede ejecutar en local.

Requisitos:
  pip install requests firebase-admin

Variables de entorno necesarias:
  FIREBASE_PROJECT_ID   → ID de tu proyecto Firebase
  FIREBASE_CREDENTIALS  → JSON de credenciales de cuenta de servicio (string)
"""

import os
import json
import requests
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# ── Firebase init ─────────────────────────────────────────────────────────────
cred_json = os.environ.get("FIREBASE_CREDENTIALS", "")
if cred_json:
    cred = credentials.Certificate(json.loads(cred_json))
else:
    # En local: usa el archivo de credenciales directamente
    cred = credentials.Certificate("firebase-credentials.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_ine(tabla_id: int, n_ultimos: int = 13) -> list:
    url = f"https://servicios.ine.es/wstempus/js/es/DATOS_TABLA/{tabla_id}?tip=AM&nult={n_ultimos}"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

def extraer_valor(series: list, contiene: str, periodo: str) -> float | None:
    for s in series:
        if contiene.lower() in s.get("Nombre", "").lower():
            for d in s.get("Data", []):
                if d.get("NombrePeriodo") == periodo:
                    return d.get("Valor")
    return None

# ── Descarga ──────────────────────────────────────────────────────────────────
print("Descargando EOH — Viajeros y pernoctaciones por CCAA (tabla 2074)...")
viajeros_raw = get_ine(2074, 24)

print("Descargando IPH — Índice de precios hoteleros (tabla 2070)...")
iph_raw = get_ine(2070, 3)

print("Descargando IRSH — RevPAR y ADR (tabla 2942)...")
irsh_raw = get_ine(2942, 3)

print("Descargando EOH — Ocupación por habitaciones (tabla 2066)...")
ocup_raw = get_ine(2066, 3)

# ── Periodo más reciente disponible ──────────────────────────────────────────
ultimo_periodo = viajeros_raw[0]["Data"][0]["NombrePeriodo"]
print(f"Último periodo disponible: {ultimo_periodo}")

# ── KPIs nacionales ───────────────────────────────────────────────────────────
total_pernoctaciones = extraer_valor(
    viajeros_raw, "Pernoctaciones. Total Nacional. Total viajeros", ultimo_periodo
)
revpar = extraer_valor(irsh_raw, "RevPAR. Nacional", ultimo_periodo)
adr    = extraer_valor(irsh_raw, "ADR. Nacional", ultimo_periodo)
ocup   = extraer_valor(ocup_raw, "Grado de ocupación por habitaciones. Nacional", ultimo_periodo)
iph    = extraer_valor(iph_raw,  "Índice de precios hoteleros. Nacional. Variación anual", ultimo_periodo)

# Variación anual pernoctaciones (comparamos con mismo mes año anterior)
meses_data = [d for s in viajeros_raw if "Pernoctaciones. Total Nacional. Total viajeros" in s.get("Nombre","")
              for d in s.get("Data", [])]
val_actual = next((d["Valor"] for d in meses_data if d["NombrePeriodo"] == ultimo_periodo), None)
# Periodo -12 meses
from dateutil.relativedelta import relativedelta
dt = datetime.strptime(ultimo_periodo, "%B %Y")
dt_ant = dt - relativedelta(months=12)
periodo_ant = dt_ant.strftime("%-B %Y")  # Linux; en Windows usar %#B
val_anterior = next((d["Valor"] for d in meses_data if d["NombrePeriodo"] == periodo_ant), None)
variacion_anual = ((val_actual - val_anterior) / val_anterior * 100) if val_actual and val_anterior else None

# ── Datos por CCAA ────────────────────────────────────────────────────────────
CCAAS = [
    "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria",
    "Castilla y León", "Castilla-La Mancha", "Cataluña", "Comunitat Valenciana",
    "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia", "Navarra", "País Vasco",
]

por_ccaa = []
for ccaa in CCAAS:
    pernoc = extraer_valor(viajeros_raw, f"Pernoctaciones. {ccaa}. Total", ultimo_periodo)
    viaj   = extraer_valor(viajeros_raw, f"Viajeros. {ccaa}. Total", ultimo_periodo)
    occ    = extraer_valor(ocup_raw, f"Grado de ocupación. {ccaa}", ultimo_periodo)
    if pernoc:
        por_ccaa.append({
            "ccaa": ccaa,
            "pernoctaciones": pernoc,
            "viajeros": viaj or 0,
            "variacion_anual": 0,  # TODO: calcular igual que nacional
            "ocupacion": occ or 0,
        })

# ── Serie mensual (últimos 13 meses) ─────────────────────────────────────────
MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
            "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

serie_nacional = next(
    (s for s in viajeros_raw if "Pernoctaciones. Total Nacional. Total viajeros" in s.get("Nombre","")), None
)
mensual = []
if serie_nacional:
    for d in reversed(serie_nacional["Data"]):
        try:
            nombre = d["NombrePeriodo"]  # ej "Enero 2025"
            partes = nombre.split()
            m_idx = MESES_ES.index(partes[0])
            anyo = partes[1]
            mes_key = f"{anyo}-{str(m_idx+1).zfill(2)}"
            mensual.append({
                "mes": mes_key,
                "label": MESES_CORTOS[m_idx],
                "pernoctaciones": d["Valor"],
                "viajeros": 0,  # añadir si se necesita
            })
        except Exception:
            continue

# ── Snapshot final ────────────────────────────────────────────────────────────
snapshot = {
    "periodo": ultimo_periodo,
    "actualizado": datetime.now().strftime("%Y-%m-%d"),
    "kpis": {
        "total_pernoctaciones": total_pernoctaciones or 0,
        "variacion_anual": round(variacion_anual, 2) if variacion_anual else 0,
        "revpar": revpar or 0,
        "adr": adr or 0,
        "ocupacion": ocup or 0,
        "iph": iph or 0,
        "periodo": ultimo_periodo,
    },
    "por_ccaa": por_ccaa,
    "mensual": mensual,
}

# ── Subir a Firestore ─────────────────────────────────────────────────────────
doc_id = ultimo_periodo.replace(" ", "_")
db.collection("eoh").document(doc_id).set(snapshot)
print(f"✅ Subido a Firebase: eoh/{doc_id}")
print(f"   KPIs: {json.dumps(snapshot['kpis'], ensure_ascii=False, indent=2)}")
