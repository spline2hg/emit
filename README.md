# Emit - Log Aggregation Platform

A modern log aggregation and management platform that ingests, processes, and visualizes logs from multiple services across different storage backends.

## Features

- **Real-time log Ingestion**: HTTP API for log ingestion with batch support
- **Multi-Backend Storage**: Support for Elasticsearch, SQLite, and S3
- **Kafka Integration**: Asynchronous log processing via Kafka
- **Log Filtering & Search**: Advanced filtering by log level, service, date range, and search queries
- **Project Management**: Organize logs by projects with API key authentication

## Tech Stack

**Backend**
- FastAPI
- Python 3.12+
- SQLAlchemy ORM
- Kafka for message processing
- Elasticsearch, SQLite, and S3 support

**Frontend**
- React with TypeScript
- Vite build tool
- Tailwind CSS
- React Router for navigation

**Infrastructure**
- Docker Compose for local development
- Kafka message broker
- Elasticsearch for log storage
- MinIO for S3-compatible storage

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- Python 3.12+
- uv (Python package manager)

### Setup

1. Clone the repository
```bash
git clone <repository>
cd emit
```

2. Copy environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start services
```bash
docker-compose up -d
```

4. Install dependencies
```bash
# Backend
uv sync

# Frontend
cd frontend
npm install
cd ..
```

5. Run the application
```bash
./start.sh
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## API Endpoints

- `POST /ingest` - Ingest a single log
- `POST /ingest/batch` - Ingest multiple logs
- `GET /logs` - Fetch logs with filtering
- `GET /logs/services` - Get available services
- `POST /projects` - Create a project
- `GET /projects` - List projects

## Project Structure

```
emit/
├── src/                # Backend source code
│   ├── main.py         # FastAPI application
│   ├── models.py       # Data models
│   ├── schema.py       # Database schema
│   ├── storage.py      # Storage backends
│   ├── kafka_*.py      # Kafka producer/consumer
│   └── log_client/     # Log client library
├── frontend/           # React frontend application
│   ├── components/     # React components
│   ├── services/       # API service layer
│   └── types.ts        # TypeScript definitions
├── docker-compose.yml  # Docker services
└── start.sh            # Startup script
```

## License

MIT
