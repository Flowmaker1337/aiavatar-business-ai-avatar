import { Request, Response } from 'express';
import FlowManager from '../services/flow-manager.service';

class FlowController {
  /**
   * Gets all available flow definitions
   */
  public async getFlowDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const flowManager = FlowManager.getInstance();
      if (!flowManager.isInitialized()) {
        await flowManager.initialize();
      }
      
      const flows = flowManager.getAllFlowDefinitions();
      
      res.status(200).json({
        status: 'success',
        count: flows.length,
        flows: flows
      });
    } catch (error: any) {
      console.error('❌ Error getting flow definitions:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get flow definitions',
        error: error.message
      });
    }
  }
}

export default new FlowController(); 