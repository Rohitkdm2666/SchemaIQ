# SchemaIQ — AI Data Intelligence Platform
> Team Kaizen · Code Apex Hackathon · Problem 2.1: Data Dictionary Agent

A full-stack React + Tailwind v4 frontend for the SchemaIQ AI-powered database intelligence platform.

---

## 🚀 Quick Start (3 steps)

### 1. Install dependencies
```bash
cd schemaiq
npm install
```

### 2. Start the dev server
```bash
npm run dev
```

### 3. Open in browser
```
http://localhost:5173
```

---

## 🔑 Login Credentials

| Role    | Email                    | Password      |
|---------|--------------------------|---------------|
| **Admin**   | `admin@schemaiq.ai`  | `Kaizen@2025` |
| Analyst | `analyst@schemaiq.ai`    | `Analyst@123` |

> Both credentials are shown on the login page as clickable quick-fill buttons.

---

## 📁 Project Structure

```
schemaiq/
├── index.html                    # Vite entry point
├── vite.config.js                # Vite + Tailwind v4 config
├── package.json                  # Dependencies
└── src/
    ├── main.jsx                  # React entry
    ├── App.jsx                   # Router + auth guard
    ├── index.css                 # Tailwind v4 + custom tokens
    ├── context/
    │   └── AuthContext.jsx       # Login state + demo credentials
    ├── data/
    │   ├── db.js                 # Mock Olist dataset + KB
    │   └── chatEngine.js         # QueryBot AI response engine
    ├── components/
    │   ├── ui.jsx                # Shared UI components
    │   ├── Sidebar.jsx           # Navigation sidebar
    │   ├── Topbar.jsx            # Top header bar
    │   └── Layout.jsx            # Page wrapper
    └── pages/
        ├── LoginPage.jsx         # Login with demo credentials
        ├── Dashboard.jsx         # Main overview dashboard
        ├── QueryBotPage.jsx      # AI chatbot interface
        ├── SchemaPage.jsx        # Schema Explorer
        └── OtherPages.jsx        # ER Diagram, Dictionary, Quality,
                                  # Agents, Connections, Settings
```

---

## 💬 QueryBot — AI Database Assistant

QueryBot understands natural language questions about the Olist database:

| Example Query | What it does |
|---|---|
| `How many sales did product_id 2405 make between 12-18 March 2026?` | Returns daily sales breakdown + bar chart |
| `Show me the schema of the orders table` | Returns column info, row count, FK links |
| `What tables are linked to orders?` | Lists all FK relationships |
| `What is the data quality score for reviews?` | Returns quality score + level |
| `What are the top 5 product categories?` | Returns ranked category list |
| `What was the GMV in March 2026?` | Returns revenue chart |

**Sample Product IDs:** `2405`, `1042`, `8871`

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | **React 18** |
| Build Tool | **Vite 5** |
| Styling | **Tailwind CSS v4** (via `@tailwindcss/vite`) |
| Routing | **React Router v6** |
| Charts | **Recharts** |
| Icons | **Lucide React** |
| Utilities | **clsx** |

---

## 📄 Pages

| Route | Page |
|---|---|
| `/login` | Admin login with demo credentials |
| `/` | Dashboard — metrics, revenue chart, agents status |
| `/connections` | DB connections — configure, test, view status |
| `/schema` | Schema Explorer — browse tables and columns |
| `/er-diagram` | Interactive ER Diagram — drag, zoom, export SVG |
| `/dictionary` | AI Data Dictionary — tabbed, searchable, exportable |
| `/quality` | Data Quality — rings, heatmap, issue tracker |
| `/agents` | AI Agents — pipeline view, live log, status cards |
| `/querybot` | QueryBot — AI chat interface for database queries |
| `/settings` | Settings — models, agents, export, notifications |

---

## 🔧 Build for Production

```bash
npm run build
npm run preview
```

The `dist/` folder contains the static build ready for deployment (Netlify, Vercel, Nginx, etc.).

---

## 📦 Dataset

Primary: **Olist Brazilian E-Commerce Dataset** (Kaggle)
- 9 relational tables · 47 columns · 100K+ orders · 1.6M+ total rows

---

*Built by Team Kaizen for Code Apex — Track 2: AI Agents*
