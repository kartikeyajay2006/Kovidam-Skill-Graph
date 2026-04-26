# Backend - Kovidam Skill Graph

This is the backend service for the Kovidam Skill Graph project.

## Structure

- `app/`: Main application code
  - `api/`: API routes (v1)
  - `agents/`: AI agents for various platforms (GitHub, Kaggle, etc.)
  - `services/`: Business logic services
  - `pipelines/`: Data ingestion and enrichment pipelines
  - `integrations/`: Third-party service integrations
  - `db/`: Database configurations (Postgres, Vector, Graph)
  - `workers/`: Background job consumers
- `tests/`: Unit and integration tests
- `scripts/`: Utility scripts
- `docker/`: Docker configuration files

## Setup and Running

### 1. Environment Setup
It is recommended to use a virtual environment:
```bash
# Create a virtual environment
python -m venv venv

# Activate it
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Running the Backend

#### Using Python
You can run the application directly using Python:
```bash
python app/main.py
```

#### Using Uvicorn (Development Mode)
For development with auto-reload, run:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.
You can access the interactive API documentation at `http://localhost:8000/docs`.
