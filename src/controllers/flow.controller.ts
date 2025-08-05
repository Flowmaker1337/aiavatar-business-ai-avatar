import { Request, Response } from 'express';
import FlowManager from '../services/flow-manager.service';

class FlowController {
  /**
   * Gets all available flow definitions for specific avatar type
   */
  public async getFlowDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const { avatar_type } = req.query;
      const flowManager = FlowManager.getInstance();
      
      // Load appropriate flow definitions based on avatar type
      if (avatar_type && typeof avatar_type === 'string') {
        await flowManager.loadFlowDefinitionsForAvatar(avatar_type);
      } else {
        // Default initialization if no avatar_type specified
        if (!flowManager.isInitialized()) {
          await flowManager.initialize();
        }
      }
      
      const flows = flowManager.getAllFlowDefinitions();
      
      res.status(200).json({
        status: 'success',
        count: flows.length,
        flows: flows,
        avatar_type: avatar_type || 'networker'
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