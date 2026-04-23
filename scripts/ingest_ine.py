"""
ingest_ine.py — Descarga datos EOH del INE y los sube a Firebase Firestore
Corre en GitHub Actions cada mes (día 28) o manualmente.

Variables de entorno necesarias:
  FIREBASE_CREDENTIALS → JSON de credenciales de cuenta de servicio (string)

Nota: Actualizar ADR_MANUAL cada mes con el dato de la nota de prensa del INE.
"""

import os, json, requests
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# ── Firebase init ─────────────────────────────────────────────────────────────
cred_json = os.environ.get("FIREBASE_CREDENTIALS", "")
if cred_json:
    cred = credentials.Certificate(json.loads(cred_json))
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {'projectId': 'barometro-hotelero'})
else:
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase-credentials.json")
        firebase_admin.initialize_app(cred, {'projectId': 'barometro-hotelero'})

db = firestore.client()
print("Firebase conectado")

# ── Constantes ────────────────────────────────────────────────────────────────
MESES_LARGOS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

CCAAS = {
    "Andalucía":          "Andalucía",
    "Aragón":             "Aragón",
    "Asturias":           "Asturias (Principado de)",
    "Baleares":           "Baleares (Illes)",
    "Canarias":           "Canarias",
    "Cantabria":          "Cantabria",
    "Castilla y León":    "Castilla y León",
    "Castilla-La Mancha": "Castilla - La Mancha",
    "Cataluña":           "Cataluña",
    "C. Valenciana":      "Comunitat Valenciana",
    "Extremadura":        "Extremadura",
    "Galicia":            "Galicia",
    "La Rioja":           "Rioja (La)",
    "Madrid":             "Madrid (Comunidad de)",
    "Murcia":             "Murcia (Región de)",
    "Navarra":            "Navarra (Comunidad Foral de)",
    "País Vasco":         "País Vasco",
}

# ── ADR manual — actualizar cada mes con nota de prensa INE ──────────────────
# Marzo 2026: "Los hoteles facturaron 116.3 euros de media por habitación ocupada"
ADR_MANUAL = 116.3

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_ine(tabla_id, n=24):
    url = f"https://servicios.ine.es/wstempus/js/es/DATOS_TABLA/{tabla_id}?tip=AM&nult={n}"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

def buscar_valor(series, nombre_exacto, anyo, mes_num):
    mes_str = f"M{str(mes_num).zfill(2)}"
    for s in series:
        if s.get("Nombre","").strip() == nombre_exacto.strip():
            for d in s.get("Data",[]):
                if d["Anyo"] == anyo and d["T3_Periodo"] == mes_str:
                    return d.get("Valor")
    return None

def buscar_contiene(series, fragmento, anyo, mes_num):
    mes_str = f"M{str(mes_num).zfill(2)}"
    for s in series:
        if fragmento.lower() in s.get("Nombre","").lower():
            for d in s.get("Data",[]):
                if d["Anyo"] == anyo and d["T3_Periodo"] == mes_str:
                    return d.get("Valor")
    return None

# ── Descarga ──────────────────────────────────────────────────────────────────
print("Descargando datos INE...")
viajeros  = get_ine(2074, 24)
ocup_data = get_ine(2066, 3)
iph_data  = get_ine(12157, 3)
print("Datos descargados")

# ── Periodo más reciente ──────────────────────────────────────────────────────
d0 = viajeros[0]["Data"][0]
ultimo_anyo = d0["Anyo"]
ultimo_mes  = int(d0["T3_Periodo"].replace("M",""))
ultimo_label = f"{MESES_LARGOS[ultimo_mes-1]} {ultimo_anyo}"
print(f"Último periodo: {ultimo_label}")

# ── KPIs nacionales ───────────────────────────────────────────────────────────
total_pernoc = buscar_valor(viajeros,
    "Nacional. Pernoctaciones. Total categorías. Total.", ultimo_anyo, ultimo_mes)
ocup_val = buscar_valor(ocup_data,
    "Nacional. Grado de ocupación por habitaciones.", ultimo_anyo, ultimo_mes)
iph_val = buscar_contiene(iph_data,
    "Nacional. Tasa de variación interanual", ultimo_anyo, ultimo_mes)
val_ant = buscar_valor(viajeros,
    "Nacional. Pernoctaciones. Total categorías. Total.", ultimo_anyo-1, ultimo_mes)
var_anual = round((total_pernoc-val_ant)/val_ant*100, 2) if total_pernoc and val_ant else 0
revpar_val = round(ADR_MANUAL * ((ocup_val or 0)/100), 1) if ocup_val else 0

# ── Datos por CCAA ────────────────────────────────────────────────────────────
por_ccaa = []
for nombre_display, nombre_ine in CCAAS.items():
    p = buscar_valor(viajeros, f"{nombre_ine}. Pernoctaciones. Total.", ultimo_anyo, ultimo_mes)
    v = buscar_valor(viajeros, f"{nombre_ine}. Viajeros. Total.", ultimo_anyo, ultimo_mes)
    o = buscar_contiene(ocup_data, f"{nombre_ine}. Grado de ocupación por habitaciones", ultimo_anyo, ultimo_mes)
    p_ant = buscar_valor(viajeros, f"{nombre_ine}. Pernoctaciones. Total.", ultimo_anyo-1, ultimo_mes)
    var = round((p-p_ant)/p_ant*100, 2) if p and p_ant else 0
    if p:
        por_ccaa.append({"ccaa": nombre_display, "pernoctaciones": p,
                         "viajeros": v or 0, "variacion_anual": var, "ocupacion": o or 0})

# ── Serie mensual ─────────────────────────────────────────────────────────────
serie_nac = next((s for s in viajeros
    if s.get("Nombre","").strip() == "Nacional. Pernoctaciones. Total categorías. Total."), None)
mensual = []
if serie_nac:
    for d in reversed(serie_nac["Data"]):
        mes_n = int(d["T3_Periodo"].replace("M",""))
        mensual.append({"mes": f"{d['Anyo']}-{str(mes_n).zfill(2)}",
                        "label": MESES_CORTOS[mes_n-1],
                        "pernoctaciones": d.get("Valor") or 0, "viajeros": 0})

# ── Subir a Firestore ─────────────────────────────────────────────────────────
snapshot = {
    "periodo": ultimo_label,
    "actualizado": datetime.now().strftime("%Y-%m-%d"),
    "kpis": {
        "total_pernoctaciones": total_pernoc or 0,
        "variacion_anual": var_anual,
        "revpar": revpar_val,
        "adr": ADR_MANUAL,
        "ocupacion": ocup_val or 0,
        "iph": iph_val or 0,
        "periodo": ultimo_label,
    },
    "por_ccaa": por_ccaa,
    "mensual": mensual,
}

doc_id = ultimo_label.replace(" ","_")
db.collection("eoh").document(doc_id).set(snapshot)
print(f"Subido a Firebase: eoh/{doc_id}")
print(f"CCAAs: {len(por_ccaa)} | Meses: {len(mensual)}")
print(json.dumps(snapshot["kpis"], ensure_ascii=False, indent=2))
