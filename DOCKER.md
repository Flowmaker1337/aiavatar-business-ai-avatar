# Docker Configuration for AI Avatar Project

This document provides comprehensive instructions for running the AI Avatar project using Docker, including both local and production configurations.

## Prerequisites

1. **Docker** - Install Docker Desktop or Docker Engine
   - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: [Docker Engine](https://docs.docker.com/engine/install/)

2. **Docker Compose** - Usually included with Docker Desktop
   - For Linux: Install separately if needed

3. **API Keys** - You need the following external service API keys:
   - OpenAI API Key
   - Pinecone API Key, Environment, Project ID
   - Eleven Labs API Key

## Quick Start

### Local Development (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd AIAvatar

# Copy environment file
cp .env.example .env

# Edit .env file with your API keys
# Required: OPENAI_API_KEY, ELEVEN_LABS_API_KEY
# Optional: PINECONE_API_KEY, PINECONE_ENVIRONMENT, PINECONE_PROJECT_ID, PINECONE_INDEX_NAME

# Start with local databases (MongoDB, Redis, Qdrant)
docker-compose -f docker-compose.local.yml up -d

# Or use default configuration
docker-compose up -d
```

### Production with External Databases
```bash
# Configure external databases in .env file
# MONGODB_URI, REDIS_URL, QDRANT_URL (optional)

# Start with external databases
docker-compose -f docker-compose.external.yml up -d

# If you want local Qdrant with external MongoDB/Redis
docker-compose -f docker-compose.external.yml --profile local-qdrant up -d
```

## Docker Compose Configurations

The project provides three different Docker Compose configurations, each designed for specific use cases with different environment variable handling patterns:

### docker-compose.yml (Default - Flexible Configuration)
**Pattern**: `.env` → default value fallback
- **Use case**: Development, testing, flexible configuration
- **Environment handling**: Uses values from `.env` file, falls back to defaults if not set
- **Services**: aiavatar, mongodb, redis, qdrant
- **Configuration example**:
  ```yaml
  - VECTOR_DB_TYPE=${VECTOR_DB_TYPE:-qdrant}
  - MONGODB_DB_NAME=${MONGODB_DB_NAME:-npc_agent}
  - QDRANT_URL=${QDRANT_URL:-http://qdrant:6333}
  ```

### docker-compose.local.yml (Local Development - Forced Local Services)
**Pattern**: Local services regardless of `.env` settings
- **Use case**: Development, testing, isolated environment with local services only
- **Environment handling**: Forces local services, ignores `.env` for local service configurations
- **Services**: aiavatar, mongodb, redis, qdrant
- **Configuration example**:
  ```yaml
  - QDRANT_URL=http://qdrant:6333  # Always local
  - MONGODB_DB_NAME=${MONGODB_DB_NAME:-npc_agent}  # .env → default
  # No API keys for local services
  ```

### docker-compose.external.yml (Production - Strict .env Requirement)
**Pattern**: Strict `.env` requirement, no default values
- **Use case**: Production, shared databases, cloud services
- **Environment handling**: Requires explicit `.env` configuration for all external services
- **Services**: aiavatar only (external databases)
- **Configuration example**:
  ```yaml
  - QDRANT_COLLECTION_NAME=${QDRANT_COLLECTION_NAME}  # Must be in .env
  - MONGODB_URI=${MONGODB_URI}  # Must be in .env
  - QDRANT_URL=${QDRANT_URL}  # Must be in .env (no default)
  ```

## Configuration Logic Explained

### Local Environment (docker-compose.local.yml)
- **Forces local services**: MongoDB, Redis, and Qdrant always run locally
- **Ignores .env for local services**: QDRANT_URL is hardcoded to local container
- **No API keys**: Removes QDRANT_API_KEY as local Qdrant doesn't need it
- **Consistent MongoDB pattern**: All MongoDB variables use `${VAR:-default}` pattern

### External Environment (docker-compose.external.yml)
- **Requires explicit .env**: All variables must be set in `.env` file
- **No default values**: Removes default values to force explicit configuration
- **QDRANT_URL configuration**: Must be set in .env (e.g., `http://localhost:6333` for local Qdrant, `http://external-host:6333` for external)
- **Production-ready**: Designed for production with external managed services

### Default Environment (docker-compose.yml)
- **Flexible configuration**: Uses `.env` values or falls back to defaults
- **Hybrid approach**: Can mix local and external services
- **Developer-friendly**: Sensible defaults for quick setup

## Environment Variables

### Required Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `ELEVEN_LABS_API_KEY` - Your Eleven Labs API key

### Vector Database Configuration
- `VECTOR_DB_TYPE` - Vector database type: `pinecone` or `qdrant` (default: `qdrant`)

#### For Pinecone (Cloud Service)
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_ENVIRONMENT` - Your Pinecone environment
- `PINECONE_PROJECT_ID` - Your Pinecone project ID
- `PINECONE_INDEX_NAME` - Your Pinecone index name

#### For Qdrant (Local/External)
- `QDRANT_URL` - Qdrant server URL (default: `http://localhost:6333` for external, `http://qdrant:6333` for local)
- `QDRANT_COLLECTION_NAME` - Qdrant collection name (default: `knowledge_base`)
- `QDRANT_API_KEY` - Qdrant API key (optional for local setup)

### Database Configuration
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://mongodb:27017/npc_agent`)
- `MONGODB_DB_NAME` - MongoDB database name (default: `npc_agent`)
- `MONGODB_USERS_COLLECTION` - Users collection name (default: `users`)
- `MONGODB_AVATARS_COLLECTION` - Avatars collection name (default: `avatars`)
- `MONGODB_SESSIONS_COLLECTION` - Sessions collection name (default: `sessions`)
- `MONGODB_CHAT_HISTORY_COLLECTION` - Chat history collection name (default: `chatHistory`)
- `REDIS_URL` - Redis connection string (default: `redis://redis:6379`)

### Optional Variables
- `NODE_ENV` - Environment (default: development)
- `PORT` - Application port (default: 3000)
- `MAX_TOKENS` - Maximum tokens for AI responses (default: 1000)

## Usage Examples by Environment

### Local Development
```bash
# Forces all local services, ignores .env for local configurations
docker-compose -f docker-compose.local.yml up -d

# Uses local MongoDB, Redis, Qdrant regardless of .env settings
# No API keys needed for local services
```

### Production with External Services
```bash
# Requires complete .env configuration
docker-compose -f docker-compose.external.yml up -d

# All database connections must be configured in .env
# No default values provided

# Example .env for external services:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
# REDIS_URL=redis://user:pass@redis-host:6379
# QDRANT_URL=http://external-qdrant-host:6333

# Example .env for local Qdrant with external databases:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
# REDIS_URL=redis://user:pass@redis-host:6379
# QDRANT_URL=http://localhost:6333
```

### Flexible Development
```bash
# Uses .env values or defaults
docker-compose up -d

# Can mix local and external services
# Sensible defaults for quick setup
```

## Vector Database Setup

### Using Qdrant (Recommended for Local Development)

The project now uses the official `@qdrant/js-client-rest` library for improved performance, better error handling, and automatic API updates.

1. **Start with Qdrant**:
   ```bash
   docker-compose up -d
   ```

2. **Upload knowledge base to Qdrant**:
   ```bash
   npm run upload-qdrant
   ```

3. **Clear Qdrant data if needed**:
   ```bash
   npm run clear-qdrant
   ```

### Using Pinecone (Cloud Service)

1. **Configure Pinecone in .env**:
   ```bash
   VECTOR_DB_TYPE=pinecone
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENVIRONMENT=your_environment
   PINECONE_PROJECT_ID=your_project_id
   PINECONE_INDEX_NAME=your_index_name
   ```

2. **Upload knowledge base to Pinecone**:
   ```bash
   npm run upload-pinecone
   ```

3. **Clear Pinecone data if needed**:
   ```bash
   npm run clear-pinecone
   ```

## Useful Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f aiavatar
docker-compose logs -f qdrant
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Access services
```bash
# Application
http://localhost:3000

# Qdrant API
http://localhost:6333

# MongoDB (if using external client)
mongodb://localhost:27017

# Redis (if using external client)
redis://localhost:6379
```

### Database operations
```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh

# Access Redis CLI
docker-compose exec redis redis-cli

# Check Qdrant health
curl http://localhost:6333/
```

### Container management
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build

# Restart specific service
docker-compose restart aiavatar
```

## Troubleshooting

### Qdrant Connection Issues
```bash
# Check if Qdrant is running
docker-compose ps qdrant

# Check Qdrant logs
docker-compose logs qdrant

# Restart Qdrant
docker-compose restart qdrant
```

### Vector Database Health Check
```bash
# Check Qdrant health
curl http://localhost:6333/

# Expected response:
# {"title":"qdrant - vector similarity search engine","version":"1.7.0"}
```

### Data Persistence
- MongoDB data: `mongodb_data` volume
- Redis data: `redis_data` volume
- Qdrant data: `qdrant_data` volume

To backup data:
```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# Backup Redis (if needed)
docker-compose exec redis redis-cli BGSAVE

# Qdrant data is automatically persisted in volume
```

### Performance Optimization
- For production, consider using external managed services
- Qdrant can be scaled horizontally in production
- Monitor memory usage for vector operations

## Production Deployment

### Using External Services
```bash
# Configure external databases in .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
REDIS_URL=redis://user:pass@redis-host:6379
QDRANT_URL=http://qdrant-host:6333

# Start with external configuration
docker-compose -f docker-compose.external.yml up -d
```

### Using Local Qdrant with External Databases
```bash
# Start with external MongoDB/Redis but local Qdrant
docker-compose -f docker-compose.external.yml --profile local-qdrant up -d
```

### Health Monitoring
```bash
# Check all services health
curl http://localhost:3000/health

# Check Qdrant health
curl http://localhost:6333/

# Check MongoDB connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

## Security Considerations

1. **Never commit `.env` files** - They contain sensitive API keys
2. **Use secrets management** in production
3. **Regularly update base images** for security patches
4. **Use non-root user** (already configured in Dockerfile)
5. **Limit container resources** in production

## Performance Optimization

1. **Multi-stage builds** - For smaller production images
2. **Layer caching** - Optimize Dockerfile for faster builds
3. **Resource limits** - Set CPU and memory limits
4. **Health checks** - Add health check endpoints 