# Barómetro Hotelero España

Dashboard de datos mensuales del sector hotelero en España.  
Fuente: INE — Encuesta de Ocupación Hotelera (EOH), IPH e IRSH.

## Stack

- **Frontend**: Next.js 14 + TypeScript + Recharts → desplegado en Vercel
- **Base de datos**: Firebase Firestore (free tier)
- **Datos**: API pública del INE, ingestada automáticamente con GitHub Actions

## Setup en 10 minutos

### 1. Clona el repo y configura Firebase

```bash
git clone https://github.com/TU_USUARIO/barometro-hotelero
cd barometro-hotelero
npm install
```

En [Firebase Console](https://console.firebase.google.com):
1. Nuevo proyecto → Firestore Database → Modo producción
2. Reglas Firestore: permite lectura pública, escritura solo autenticada:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /eoh/{document} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

3. Configuración del proyecto → Tus apps → Web → copia las credenciales

### 2. Variables de entorno

```bash
cp .env.example .env.local
# Rellena con tus credenciales de Firebase
```

### 3. Ejecutar en local

```bash
npm run dev
# → http://localhost:3000
```

El MVP funciona con datos demo sin Firebase configurado.

### 4. Desplegar en Vercel

```bash
npx vercel  # primera vez
npx vercel --prod  # siguientes
```

Añade las variables de entorno en Vercel: Settings → Environment Variables.

### 5. Configurar ingestión automática de datos

En GitHub: Settings → Secrets → Actions:
- `FIREBASE_CREDENTIALS`: pega el JSON completo de tu cuenta de servicio Firebase  
  (Firebase Console → Configuración → Cuentas de servicio → Generar clave privada)

El workflow `.github/workflows/update_datos.yml` descarga datos del INE  
y los sube a Firestore el día 28 de cada mes automáticamente.

### 6. Conectar Firebase en el código

Cuando tengas Firebase configurado, edita `app/api/datos/route.ts`:
descomenta el bloque de Firestore y elimina el return con DEMO_DATA.

## Estructura

```
app/
  page.tsx              ← Dashboard principal
  api/datos/route.ts    ← API que lee de Firebase (o demo)
  globals.css           ← Estilos globales
lib/
  firebase.ts           ← Conexión Firebase
  types.ts              ← Tipos TypeScript
scripts/
  ingest_ine.py         ← Ingestión INE → Firebase
.github/workflows/
  update_datos.yml      ← Cron mensual GitHub Actions
```

## Próximos pasos

- [ ] Añadir muro de pago con Stripe para datos históricos
- [ ] Filtros por CCAA y rango de fechas
- [ ] Comparativa interanual
- [ ] Versión por provincia
- [ ] Newsletter automática con el informe mensual
