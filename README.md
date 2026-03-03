# 💸 CashFlow App

Gestión de cashflow empresarial. React + Vite frontend, Node.js/Express backend, PostgreSQL.

---

## 📁 Estructura

```
cashflow/
├── backend/
│   ├── src/
│   │   ├── index.js           # Entry point + sirve frontend en prod
│   │   ├── db.js              # PostgreSQL schema + seed automático
│   │   └── routes/            # transactions, cuentas, dashboard
│   ├── railway.toml
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/useData.js   # Estado global + API calls
│   │   ├── lib/api.js         # Cliente HTTP
│   │   ├── components/        # UI, TxModal, DeleteModal
│   │   └── pages/             # Dashboard, Movimientos, Obligaciones, Fondos, Análisis, Cuentas
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🖥 Setup local

### 1. Instalar dependencias

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cashflow
PORT=3001
NODE_ENV=development
```

### 3. Crear la base de datos

```bash
createdb cashflow
```

El schema y datos de ejemplo se crean automáticamente al iniciar el backend.

### 4. Correr en desarrollo

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend  
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- El proxy de Vite redirige `/api/*` al backend automáticamente en dev.

---

## 🚂 Deploy en Railway (UN solo servicio)

La forma más simple: backend + frontend en **un mismo servicio Railway**.
El backend buildea el frontend y lo sirve como archivos estáticos.

### Paso 1 — Subir a GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/tu-user/cashflow.git
git push -u origin main
```

### Paso 2 — Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app) → **New Project**
2. Click **+ New** → **Database** → **Add PostgreSQL**
3. Click **+ New** → **GitHub Repo** → seleccionar tu repo
4. En **Root Directory** escribir: `backend`

### Paso 3 — Variables de entorno del servicio

En Railway → tu servicio backend → **Variables**:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Click **+ Reference** → seleccionar `DATABASE_URL` de la PostgreSQL |
| `NODE_ENV` | `production` |

> ⚠️ **No necesitás** `VITE_API_URL` con esta configuración porque el backend sirve al frontend directamente desde el mismo origen.

### Paso 4 — Deploy

Railway buildea automáticamente. El `railway.toml` del backend hace:
1. `cd ../frontend && npm install && npm run build` → genera el `dist/`
2. `node src/index.js` → sirve la API + el frontend estático

### Paso 5 — Verificar

- Health check: `https://tu-app.up.railway.app/api/health`
- App: `https://tu-app.up.railway.app`

---

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/transactions` | Listar movimientos |
| POST | `/api/transactions` | Crear movimiento |
| PUT | `/api/transactions/:id` | Editar movimiento |
| DELETE | `/api/transactions/:id` | Eliminar movimiento |
| GET | `/api/cuentas` | Listar cuentas |
| POST | `/api/cuentas` | Crear cuenta |
| DELETE | `/api/cuentas/:id` | Eliminar cuenta |
| GET | `/api/dashboard` | Estado del dashboard |
| PUT | `/api/dashboard/config` | Guardar obligaciones / saldo respaldo |
| POST/PUT/DELETE | `/api/dashboard/estimado/:id` | Dinero estimado por cobrar |
| POST/PUT/DELETE | `/api/dashboard/fondos/:id` | Fondos de inversión |

---

## 🛠 Stack

- **Frontend**: React 18, Vite, Recharts
- **Backend**: Node.js, Express, pg
- **DB**: PostgreSQL
- **Deploy**: Railway (fullstack en un servicio)
