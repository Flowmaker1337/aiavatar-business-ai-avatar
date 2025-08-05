# AI Avatar System - Installation Guide

## Prerequisites
- Docker and Docker Compose
- Node.js 20+ and npm 9+ (for development)

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd aiavatar
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env  # or use your editor
```

### 3. Start Application
```bash
# Build and run application
docker-compose up -d
```

### 4. Access
The application will be available at:
- API: http://localhost:3000
- Qdrant: http://localhost:6333

## Required API Keys

### OpenAI API
1. Go to https://platform.openai.com/
2. Create account and generate API key
3. Add to .env: `OPENAI_API_KEY=your_key`

### Pinecone (optional)
1. Go to https://www.pinecone.io/
2. Create account and project
3. Add configuration to .env:
   ```
   PINECONE_API_KEY=your_key
   PINECONE_ENVIRONMENT=your_env
   PINECONE_PROJECT_ID=your_project
   PINECONE_INDEX_NAME=your_index
   ```

### Eleven Labs (optional)
1. Go to https://elevenlabs.io/
2. Create account and generate API key
3. Add to .env: `ELEVEN_LABS_API_KEY=your_key`

## Testing Installation

```bash
# Check system health
curl http://localhost:3000/health

# Check vector database
curl http://localhost:6333/

# Load knowledge base
npm run upload-qdrant
```

## Alternative Configurations

### Local Development
```bash
docker-compose -f docker-compose.local.yml up -d
```

### Production with External Databases
```bash
docker-compose -f docker-compose.external.yml up -d
```

## Troubleshooting

### Service Logs
```bash
docker-compose logs -f
```

### Service Status
```bash
docker-compose ps
```

### Restart Services
```bash
docker-compose restart
```

### Clean Installation
```bash
docker-compose down -v
docker-compose up -d
``` 