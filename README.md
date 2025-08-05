# AI Avatar - Configurable AI Avatar System

A configurable AI avatar system that enables creating AI avatars with their own knowledge base and personality.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm 9+
- Docker and Docker Compose

### Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd aiavatar
```

2. **Configure environment variables**
```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env  # or use your editor
```

3. **Start application**
```bash
# Build and run application
docker-compose up -d

# Or for local development
docker-compose -f docker-compose.local.yml up -d
```

4. **Load knowledge base to Qdrant**
```bash
npm run upload-qdrant
```

5. **Test functionality**
```bash
curl http://localhost:3000/health
curl http://localhost:6333/  # Qdrant
```

## 📊 Architecture

The system supports two vector databases:
- **Qdrant** (local Docker) - default
- **Pinecone** (cloud) - external

```bash
# Default configuration
VECTOR_DB_TYPE=qdrant    # Default choice
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION_NAME=knowledge_base

# Alternative configuration
VECTOR_DB_TYPE=pinecone
PINECONE_API_KEY=your_key
PINECONE_INDEX_NAME=leasing_knowledge
```

### Knowledge Base Management

```bash
# Load knowledge to Qdrant
npm run upload-qdrant

# Clear Qdrant database
npm run clear-qdrant

# Load knowledge to Pinecone
npm run upload-pinecone

# Clear Pinecone database
npm run clear-pinecone
```

## 🔧 Tech Stack

- **Backend** - Node.js + Express + TypeScript
- **Knowledge Base** - Qdrant/Pinecone for vectors
- **Database** - MongoDB for sessions and users
- **Cache** - Redis for sessions
- **AI** - OpenAI for responses and embeddings
- **Speech** - Eleven Labs for synthesis
- **Infrastructure** - Docker Compose

## 🐳 Docker Deployment

The project includes three Docker configurations:

#### Local Development
```bash
docker-compose -f docker-compose.local.yml up -d
```
- Local databases (MongoDB, Redis, Qdrant)
- Perfect for development and testing

#### Production with External Databases
```bash
docker-compose -f docker-compose.external.yml up -d
```
- External databases from .env
- Ready for production deployment

#### Default Configuration
```bash
docker-compose up -d
```
- Hybrid: external or local databases
- Configurable through .env

### Troubleshooting
```bash
# Check logs
docker-compose logs -f

# Restart application
docker-compose restart aiavatar

# Check service status
docker-compose ps

# Database access
curl http://localhost:6333/    # Qdrant
curl http://localhost:3000/health
```

## 🔧 Development

### Avatar Structure
Each avatar can have:
- Own knowledge base
- Unique personality
- Specialized topics

### Adding New Avatar
1. Create knowledge base in JSON
2. Load to selected vector database
```bash
npm run upload-qdrant  # or upload-pinecone
```

## 📡 API

#### Main Endpoints
- `POST /api/query` - Standard query processing
- `POST /api/query/stream` - Streaming queries (SSE)
- `GET /api/streaming/listen` - SSE listening

#### Example Query
```json
{
  "user_message": "How does operating lease work?",
  "session_id": "optional-session-id"
}
```

## 📚 Documentation
- [DOCKER.md](DOCKER.md) - Detailed Docker configuration
- [INSTALL.md](INSTALL.md) - Installation guide
- [docs/](docs/) - Project documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

© 2025 AI Avatar Project. All rights reserved.

This project is private and commercial property. Source code, documentation and all materials related to the project are protected by copyright. Copying, modification, distribution or use of this code is prohibited without explicit consent of the project owner.

### Troubleshooting

In case of problems:
1. Check logs: `docker-compose logs -f`
2. Check service status: `docker-compose ps`
3. Check system health: `curl http://localhost:3000/health`
4. Check Qdrant: `curl http://localhost:6333/` 