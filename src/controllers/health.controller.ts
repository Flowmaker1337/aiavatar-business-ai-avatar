import { Request, Response } from 'express';
import vectorDatabaseService from '../services/vector-database.service';
import { getVectorDatabaseName } from '../config/env';

class HealthController {
  
  /**
   * General application health check
   */
  public async getApplicationHealth(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      message: 'AI Avatar system API is working correctly',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Vector database health check
   */
  public async getVectorDatabaseHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await vectorDatabaseService.getDetailedHealthStatus();
      
      res.status(200).json({
        status: 'success',
        vectorDatabase: healthStatus
      });
    } catch (error: any) {
      console.error('Error checking vector database health:', error.message);
      res.status(500).json({
        status: 'error',
        message: 'Error checking vector database health',
        vectorDatabase: {
          databaseType: getVectorDatabaseName(),
          isHealthy: false,
          message: error.message,
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Detailed health check for all system components
   * Future implementation for comprehensive monitoring
   */
  public async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      // Get vector database health
      const vectorDbHealth = await vectorDatabaseService.getDetailedHealthStatus();
      
      // TODO: Add other health checks here
      // - MongoDB health
      // - Redis health
      // - OpenAI API connectivity
      // - External services status
      
      const healthReport = {
        status: 'success',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        components: {
          vectorDatabase: vectorDbHealth,
          // TODO: Add other components
          // mongodb: await mongoDbHealth(),
          // redis: await redisHealth(),
          // openai: await openaiHealth()
        },
        overall: {
          isHealthy: vectorDbHealth.isHealthy, // TODO: Combine all component statuses
          message: vectorDbHealth.isHealthy ? 'All systems operational' : 'Some components are down'
        }
      };

      const statusCode = healthReport.overall.isHealthy ? 200 : 503;
      res.status(statusCode).json(healthReport);
      
    } catch (error: any) {
      console.error('Error during detailed health check:', error.message);
      res.status(500).json({
        status: 'error',
        message: 'Error performing detailed health check',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new HealthController(); 