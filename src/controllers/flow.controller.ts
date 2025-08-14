import { Request, Response } from 'express';
import FlowManager from '../services/flow-manager.service';
import fs from 'fs';
import path from 'path';

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

  /**
   * Gets all prompt templates
   */
  public async getPromptTemplates(req: Request, res: Response): Promise<void> {
    try {
      const filePath = path.resolve(__dirname, '../config/prompt-templates.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData);
      
      res.status(200).json({
        status: 'success',
        count: data.templates?.length || 0,
        templates: data.templates || []
      });
    } catch (error: any) {
      console.error('❌ Error getting prompt templates:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get prompt templates',
        error: error.message
      });
    }
  }

  /**
   * Gets all intent definitions
   */
  public async getIntentDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const filePath = path.resolve(__dirname, '../config/intent-definitions.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData);
      
      res.status(200).json({
        status: 'success',
        count: data.intents?.length || 0,
        intents: data.intents || []
      });
    } catch (error: any) {
      console.error('❌ Error getting intent definitions:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get intent definitions',
        error: error.message
      });
    }
  }
}

export default new FlowController(); 