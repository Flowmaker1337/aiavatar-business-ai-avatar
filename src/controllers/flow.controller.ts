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

  /**
   * Gets flow definitions for custom avatar (including custom flows)
   */
  public async getFlowDefinitionsForCustomAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { avatarId } = req.params;
      const flowManager = FlowManager.getInstance();
      
      // Initialize flow manager if needed
      if (!flowManager.isInitialized()) {
        await flowManager.initialize();
      }

      // Load custom flows for this avatar
      await flowManager.loadCustomFlowsForAvatar(avatarId);
      
      // Get all flows (standard + custom)
      const flows = flowManager.getFlowDefinitionsForAvatar(avatarId);
      
      res.status(200).json({
        status: 'success',
        count: flows.length,
        flows: flows,
        avatar_id: avatarId,
        avatar_type: 'custom'
      });
    } catch (error: any) {
      console.error(`❌ Error getting flow definitions for custom avatar ${req.params.avatarId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get flow definitions for custom avatar',
        error: error.message
      });
    }
  }
}

export default new FlowController(); 