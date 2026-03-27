# 🚀 SchemaIQ Setup Guide

Complete installation and setup guide for the SchemaIQ project - an AI-powered database schema analysis and visualization tool.

## 📋 Prerequisites

- **Python 3.12.10** (recommended) or Python 3.10+
- **Node.js 18+** and **npm**
- **Git** for version control

## 🏗️ Project Structure

```
SchemaIQ/
├── backend/          # FastAPI Python backend
├── frontend/         # React + Vite frontend
├── docs/            # Documentation
└── test_data/       # Sample datasets for testing
```

## 🐍 Backend Setup (Python FastAPI)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Required Python Packages
The `requirements.txt` includes:

```txt
fastapi==0.115.0              # Web framework
uvicorn[standard]==0.30.6     # ASGI server
google-generativeai==0.7.2    # Google Gemini AI integration
pandas==2.2.2                 # Data manipulation
python-dotenv==1.0.1          # Environment variables
pydantic==2.8.2               # Data validation
sqlalchemy==2.0.35            # Database ORM
pymysql==1.1.1                # MySQL driver
psycopg2-binary==2.9.10       # PostgreSQL driver
pyodbc==5.1.0                 # SQL Server driver
scikit-learn==1.3.2           # Machine learning utilities
networkx==3.2.1               # Graph analysis for relationships
python-multipart==0.0.6       # File upload support
```

### 5. Environment Configuration
Create a `.env` file in the backend directory:

```env
# Google Gemini AI API Key (optional - for enhanced AI features)
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration (optional defaults)
DEFAULT_DB_URL=sqlite:///sample_ecommerce.db

# Server Configuration
HOST=127.0.0.1
PORT=8001
```

### 6. Start Backend Server
```bash
python -m uvicorn main:app --port 8001 --reload
```

**Backend will be available at:** `http://localhost:8001`

## ⚛️ Frontend Setup (React + Vite)

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Required Node Modules
The `package.json` includes:

**Dependencies:**
```json
{
  "react": "^18.3.1",           # React framework
  "react-dom": "^18.3.1",      # React DOM rendering
  "react-router-dom": "^6.22.3", # Client-side routing
  "recharts": "^2.12.7",       # Charts and data visualization
  "lucide-react": "^0.383.0",  # Icon library
  "clsx": "^2.1.1",            # Conditional CSS classes
  "d3": "^7.9.0"               # Data visualization library
}
```

**Dev Dependencies:**
```json
{
  "@vitejs/plugin-react": "^4.3.1",  # Vite React plugin
  "@tailwindcss/vite": "^4.0.0",     # Tailwind CSS integration
  "tailwindcss": "^4.0.0",           # CSS framework
  "vite": "^5.4.2"                   # Build tool and dev server
}
```

### 4. Start Frontend Development Server
```bash
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

## 🗄️ Database Support

SchemaIQ supports multiple database types:

### SQLite (Default - No Setup Required)
```
sqlite:///database_name.db
```

### MySQL
```bash
# Install MySQL driver (already in requirements.txt)
pip install pymysql

# Connection string format:
mysql+pymysql://username:password@host:port/database_name
```

### PostgreSQL
```bash
# Install PostgreSQL driver (already in requirements.txt)
pip install psycopg2-binary

# Connection string format:
postgresql://username:password@host:port/database_name
```

### SQL Server
```bash
# Install SQL Server driver (already in requirements.txt)
pip install pyodbc

# Connection string format:
mssql+pyodbc://username:password@host:port/database_name?driver=ODBC+Driver+17+for+SQL+Server
```

## 🧪 Testing with Sample Data

### 1. Create Sample Database
```bash
cd backend
python create_sample_db.py
```

This creates `sample_ecommerce.db` with realistic e-commerce data for testing.

### 2. Load Test Datasets
The project includes challenging test datasets in `backend/test_data/`:

- `cryptic_biotech.csv` - Biotech data with cryptic column names
- `obscure_fintech.csv` - Blockchain/DeFi transaction data
- `mysterious_iot.csv` - IoT sensor data
- `complex_manufacturing.sql` - Manufacturing system with relationships
- `enigmatic_aerospace.sql` - Aerospace system with foreign keys
- `mixed_domain_chaos.csv` - Multi-domain scientific data

## 🚀 Quick Start Commands

### Full Setup (First Time)
```bash
# Clone repository
git clone <repository-url>
cd SchemaIQ

# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python create_sample_db.py
python -m uvicorn main:app --port 8001 --reload &

# Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev
```

### Daily Development
```bash
# Terminal 1: Backend
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
python -m uvicorn main:app --port 8001 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Won't Start
```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check for missing modules
pip list
```

#### 2. Frontend Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### 3. Database Connection Issues
```bash
# For MySQL: Install MySQL client
pip install pymysql

# For PostgreSQL: Install PostgreSQL client
pip install psycopg2-binary

# For SQL Server: Install ODBC driver
# Download from Microsoft's official site
```

#### 4. CORS Errors
The backend is configured for these origins:
- `http://localhost:5173` (Vite default)
- `http://localhost:5174` (Vite alternate)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5174`

#### 5. Port Conflicts
```bash
# Backend (change port)
python -m uvicorn main:app --port 8002 --reload

# Frontend (change port)
npm run dev -- --port 5174
```

## 📚 Key Features

### AI-Powered Data Dictionary
- **Local AI Agent**: No external API dependencies
- **Domain Classification**: Automatically identifies business verticals
- **Relationship Detection**: Finds foreign key relationships
- **Business Context Generation**: Creates human-readable descriptions
- **Quality Scoring**: Analyzes data completeness and consistency

### Database Schema Visualization
- **Interactive ER Diagrams**: Modern and classic Chen notation
- **Relationship Mapping**: Visual foreign key connections
- **Schema Explorer**: Detailed table and column information
- **Export Options**: Markdown, CSV, JSON, PDF formats

### Multi-Database Support
- **Universal Connectivity**: MySQL, PostgreSQL, SQLite, SQL Server
- **File Upload**: CSV and SQL file processing
- **Connection Builder**: Form-based and URL string options

## 🤝 Development Workflow

### 1. Making Changes
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test locally
# Backend: http://localhost:8001
# Frontend: http://localhost:5173

# Commit changes
git add .
git commit -m "Description of changes"
git push origin feature/your-feature-name
```

### 2. Testing
```bash
# Test with sample data
cd backend
python create_sample_db.py

# Test AI dictionary endpoint
curl http://localhost:8001/api/dictionary/quick

# Test frontend integration
# Navigate to http://localhost:5173 and test UI
```

### 3. Production Build
```bash
# Frontend production build
cd frontend
npm run build

# Backend production deployment
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

## 📞 Support

If you encounter issues:

1. **Check this setup guide** for common solutions
2. **Review error logs** in terminal output
3. **Verify all dependencies** are installed correctly
4. **Test with sample data** to isolate issues
5. **Check network connectivity** for database connections

## 🎯 Next Steps

After setup:

1. **Load your database** using the connection interface
2. **Explore the AI dictionary** to see intelligent schema analysis
3. **Visualize relationships** with interactive ER diagrams
4. **Export documentation** in your preferred format
5. **Test with challenging datasets** in `test_data/` folder

---

**Happy coding! 🚀**
