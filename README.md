# SchemaIQ — AI-Powered Database Intelligence Platform

> **Team Kaizen** · Code Apex Hackathon · Track 2: AI Agents

SchemaIQ is a real-time AI-powered database intelligence system that connects to your database, extracts schema information, visualizes ER diagrams, monitors data quality, and lets you query your data using natural language.

---

## ✨ Key Features

- **QueryBot** — Ask questions in plain English, get SQL + results + charts
- **ER Diagram** — Interactive, auto-generated entity-relationship visualization
- **Schema Explorer** — Browse tables, columns, types, and foreign keys
- **Data Quality** — Automated quality scoring and issue detection
- **AI Agents** — Autonomous monitoring and anomaly detection
- **Dashboard** — Real-time metrics, revenue charts, and system health

---

## 🛠 Tech Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| **Frontend** | React 18, Vite 5, Tailwind CSS v4, Recharts |
| **Backend**  | FastAPI, Python 3.10+, SQLite                |
| **AI/LLM**  | Google Gemini 2.5 Flash                      |
| **Dataset** | Olist Brazilian E-Commerce (Kaggle)          |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Gemini API Key](https://aistudio.google.com/app/apikey)
- [Olist Dataset](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) (download & extract CSVs)

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API key
copy .env.example .env   # then edit .env with your Gemini key

# Load dataset into SQLite
# (place all 9 CSV files in backend/data/ first)
python load_data.py --data ./data

# Start main server
uvicorn main:app --reload --port 8000
```

### 2. Schema Intelligence Engine Setup

```bash
cd "backend/Schema Intelligence Engine"

# Start the schema evaluation engine
uvicorn main:app --reload --port 8001
```

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

### 4. Open the app

Visit **http://localhost:5173** and log in:

| Role    | Email                | Password      |
|---------|----------------------|---------------|
| Admin   | admin@schemaiq.ai    | Kaizen@2025   |
| Analyst | analyst@schemaiq.ai  | Analyst@123   |

---

## 📁 Project Structure

```
schemaiq/
├── backend/
│   ├── main.py              # FastAPI server + Gemini integration
│   ├── load_data.py         # CSV → SQLite loader
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # API key template
│   ├── routes/
│   │   ├── health.py        # Health check endpoint
│   │   ├── metrics.py       # System metrics API
│   │   └── query.py         # Query execution API
│   ├── services/
│   │   ├── db_service.py    # Database connection layer
│   │   └── metrics_service.py # Metrics collection
│   └── agent/
│       └── monitor.py       # AI monitoring agent
├── frontend/
│   └── src/
│       ├── App.jsx           # Router + auth guard
│       ├── components/       # Sidebar, Topbar, ERDiagram, UI
│       ├── pages/            # Dashboard, QueryBot, Schema, Login
│       ├── context/          # Auth state management
│       └── data/             # Chat engine + mock data
└── README.md
```

---

## 📄 License

Built by **Team Kaizen** for Code Apex Hackathon.
