import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PORT, validateEnv } from './config/env';
import apiRoutes from './routes/api.routes';
import DatabaseService from './services/database.service';
import ExtendedDatabaseService from './services/extended-database.service';
import path from 'path';

// Check if all required environment variables are set
if (!validateEnv()) {
  console.error('Missing environment variables. Stopping application.');
  process.exit(1);
}

// Initialize database connection and sessions
const initDatabase = async () => {
  try {
    // First initialize the standard database
    const db = DatabaseService.getInstance();
    await db.connect();
    
    // Then initialize the extended database for auth
    const extendedDb = ExtendedDatabaseService.getInstance();
    await extendedDb.connect();
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};

// Close database connection
const closeDatabase = async () => {
  try {
    const db = DatabaseService.getInstance();
    await db.disconnect();
    
    const extendedDb = ExtendedDatabaseService.getInstance();
    await extendedDb.disconnect();
    
    console.log('Database connections closed successfully');
  } catch (error) {
    console.error('Error during database connection closure:', error);
  }
};

// Initialize Express application
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve new Homepage for root path
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// Authentication pages
app.get('/login.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/enhanced-avatar-builder.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'enhanced-avatar-builder.html'));
});

app.get('/flow-studio.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'flow-studio.html'));
});

app.get('/avatar-chat-dashboard.html', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'avatar-chat-dashboard.html'));
});

// Legacy routes for backward compatibility
app.get('/dashboard', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/react-dashboard', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'react-dashboard.html'));
});

// Static file handling
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Application error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle application shutdown signals
process.on('SIGINT', async () => {
  console.log('Application stopped by user (Ctrl+C)');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Application stopped by system');
  await closeDatabase();
  process.exit(0);
});

// Handle unhandled exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await closeDatabase();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled promise rejection:', promise, 'reason:', reason);
  await closeDatabase();
  process.exit(1);
});

// Initialize database before starting server
initDatabase().then(() => {
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
}); 