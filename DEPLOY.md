# Deploying Application on Vercel Platform

## Prerequisites

1. Ensure the project is properly built:
```bash
npm run build
```

2. Check that the `dist` directory contains all necessary files.

## Step 1: Connect to Vercel Platform

### Method 1: Through GitHub

1. Register or log in to [Vercel platform](https://vercel.com/)
2. Connect your GitHub account to Vercel
3. Choose project import method:
   - If the repository is public, select "Import Git Repository"
   - Alternatively, you can use "Import Third-Party Git Repository" option

### Method 2: Through Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Log in to Vercel CLI:
```bash
vercel login
```

3. Deploy application:
```bash
vercel --prod
```

## Step 2: Environment Variables Configuration

On Vercel platform, configure the following environment variables:

```bash
# Required
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_atlas_connection_string
REDIS_URL=your_redis_cloud_url

# Vector Database (choose one)
VECTOR_DB_TYPE=pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_PROJECT_ID=your_pinecone_project_id
PINECONE_INDEX_NAME=your_pinecone_index_name

# Optional
ELEVEN_LABS_API_KEY=your_eleven_labs_api_key
MAX_TOKENS=500
```

### How to set environment variables:

1. In Vercel project panel, go to "Settings" tab
2. Select "Environment Variables" section
3. Add all required environment variables
4. Click "Save" to save changes

## Step 3: Deployment and Monitoring

1. After configuring environment variables, Vercel will automatically deploy the application
2. You can monitor deployment status in "Deployments" tab
3. After deployment completion, the application will be available at the generated URL

## Troubleshooting

1. Check deployment logs in "Deployments" tab -> [select deployment] -> "Logs"
2. Ensure all environment variables are correctly configured
3. Verify that MongoDB and Redis are accessible from Vercel servers (appropriate firewall/network settings may be needed)

## Additional Recommendations

- Consider using [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) for regular tasks
- For production applications, use MongoDB Atlas and Redis Enterprise to ensure high availability
- Remember to secure API and database access through proper network configuration 