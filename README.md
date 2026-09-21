# NexusFlow – Visual IoT Telemetry & Rule Engine

NexusFlow is a full-stack IoT telemetry and visual rule processing application. It provides real-time sensor monitoring, multi-sensor event stream logging, and a DAG-based visual rule editor powered by **React Flow** to define triggers, threshold filters, and incident alerts.

---

## 🏗 Project Structure

```text
NexusFlow/
├── .gitignore               # Git ignore rules for node_modules, build artifacts, env files
├── README.md                # Project documentation and quick start guide
├── backend/
│   ├── config/
│   │   └── db.js            # MongoDB connection handler with resilient fallback
│   ├── data/
│   │   └── sampleData.js    # Default IoT fleet, telemetry & rule fixtures
│   ├── models/
│   │   ├── Device.js        # Sensor node Mongoose model
│   │   ├── Telemetry.js     # Time series metric packets model
│   │   ├── Rule.js          # Visual rule graph (nodes & edges) model
│   │   └── Alert.js         # Triggered incident model
│   ├── routes/
│   │   ├── deviceRoutes.js  # CRUD API for IoT devices
│   │   ├── telemetryRoutes.js # Telemetry streaming & time-series endpoints
│   │   ├── ruleRoutes.js    # Rule graph storage & activation
│   │   ├── alertRoutes.js   # Incident management endpoints
│   │   └── dashboardRoutes.js # Aggregated fleet telemetry stats
│   ├── .env.example         # Backend environment variable template
│   ├── package.json         # Backend dependencies and scripts
│   └── server.js            # Express application entrypoint
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── nodes/       # Custom React Flow nodes
    │   │   │   ├── SensorNode.jsx
    │   │   │   ├── FilterNode.jsx
    │   │   │   ├── ConditionNode.jsx
    │   │   │   └── AlertNode.jsx
    │   │   ├── Layout.jsx   # App shell layout
    │   │   ├── Navbar.jsx   # Status bar, latency indicator & clock
    │   │   └── Sidebar.jsx  # Navigation & broker status
    │   ├── pages/
    │   │   ├── Login.jsx    # Authentication portal
    │   │   ├── Dashboard.jsx # Fleet KPIs & Recharts telemetry area chart
    │   │   ├── RuleBuilder.jsx # React Flow drag-and-drop rule builder
    │   │   ├── Devices.jsx  # Sensor fleet inventory & provisioning
    │   │   ├── Telemetry.jsx # Live stream table & dual trend charts
    │   │   └── Alerts.jsx   # Incident triage & status resolution
    │   ├── services/
    │   │   └── api.js       # API client with automatic fallback & env configuration
    │   ├── App.jsx          # Routing definition
    │   ├── index.css        # Dark high-tech IoT theme & design system
    │   ├── main.jsx         # React entrypoint
    │   └── mockData.js      # Fallback dataset
    ├── .env.example         # Frontend environment variable template
    ├── index.html           # HTML entrypoint
    ├── package.json         # Frontend dependencies and scripts
    └── vite.config.js       # Vite configuration with /api proxy
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```
Backend runs on **http://localhost:5000** (or port configured in `.env`).

> **MongoDB Note:** If MongoDB is running locally (`mongodb://127.0.0.1:27017/nexusflow`), the server connects and auto-seeds initial data. If MongoDB is offline, the backend seamlessly operates with its in-memory sample dataset so you can test all endpoints immediately.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:3000**.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health & MongoDB connection status |
| `GET` | `/api/dashboard/stats` | KPI summary (devices, telemetry count, active rules, alerts) |
| `GET`, `POST` | `/api/devices` | Query or register IoT devices |
| `GET`, `POST` | `/api/telemetry` | Query historical telemetry or post new metrics |
| `GET` | `/api/telemetry/series` | Aggregated time-series formatted for Recharts |
| `GET`, `POST`, `PUT` | `/api/rules` | Manage visual rules, nodes, and edges |
| `PATCH` | `/api/rules/:id/toggle` | Toggle rule activation status |
| `GET`, `POST` | `/api/alerts` | Query alerts (filterable by severity and status) |
| `PATCH` | `/api/alerts/:id/status` | Update alert status (`acknowledged`, `resolved`) |

---

## 🎨 Features & Views

1. **Dashboard:**
   - 4 KPI summary cards: Total Devices, Telemetry Records, Active Rules, Recent Alerts.
   - Interactive Recharts area chart with tabs for Temperature, Humidity, Pressure, and Vibration.
   - Recent telemetry alerts table with direct severity indicators.
2. **Visual Rule Builder:**
   - Powered by **React Flow** (`@xyflow/react`).
   - Node Palette sidebar with draggable & clickable nodes: **Sensor**, **Filter**, **Condition**, and **Alert**.
   - Interactive canvas with MiniMap, Controls, Background grid, and edge connection.
3. **Devices:**
   - Device inventory table with live status (online/warning/offline), battery levels, and firmware versions.
   - Device provisioning modal dialog.
4. **Telemetry:**
   - Dual real-time Recharts line graphs.
   - Live stream simulator with pause/resume toggle.
5. **Alerts:**
   - Incident management with severity filtering (Critical, Warning, Info) and state transitions (`active` → `acknowledged` → `resolved`).
6. **Login:**
   - Industrial tech login interface with mock credential authentication.
