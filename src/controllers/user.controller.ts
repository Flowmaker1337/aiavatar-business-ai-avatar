import { Request, Response } from 'express';
import DatabaseService from '../services/database.service';

class UserController {
  
  // Endpoint for creating new user
  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email || !firstName || !lastName) {
        res.status(400).json({ error: 'Missing required parameters: email, firstName, lastName' });
        return;
      }

      // Check if user with given email already exists
      const db = DatabaseService.getInstance();
      const existingUser = await db.getUserByEmail(email);
      
      if (existingUser) {
        res.status(409).json({ error: 'User with given email address already exists' });
        return;
      }

      // Create new user
      const newUser = await db.createUser({
        email,
        firstName,
        lastName
      });

      res.status(201).json({
        success: true,
        user: newUser
      });
    } catch (error) {
      console.error('Error during user creation:', error);
      res.status(500).json({ error: 'An error occurred during user creation' });
    }
  }

  // Endpoint for getting user by ID
  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({ error: 'User ID parameter is required' });
        return;
      }

      const db = DatabaseService.getInstance();
      const user = await db.getUserById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User with given ID not found' });
        return;
      }

      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Error during user retrieval:', error);
      res.status(500).json({ error: 'An error occurred during user retrieval' });
    }
  }
}

export default new UserController(); 