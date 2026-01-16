import { Request, Response } from 'express';
import { UserPlanModel, POINTS_BY_FREQUENCY } from '../models/UserPlan';
import { TaskModel } from '../models/Task';

export const planController = {
  // Uses optionalAuthMiddleware - works with or without auth
  async getUserPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string | undefined;
      
      // If not logged in, return empty array
      if (!userId) {
        res.json([]);
        return;
      }
      
      const plans = await UserPlanModel.findByUserId(userId);
      res.json(plans);
    } catch (error) {
      console.error('Error fetching user plan:', error);
      res.status(500).json({ error: 'Failed to fetch user plan' });
    }
  },

  // Uses authMiddleware - requires auth (userId comes from JWT)
  async addTaskToPlan(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.body;
      const userId = (req as any).userId as string;

      if (!taskId) {
        res.status(400).json({ error: 'Task ID is required' });
        return;
      }

      const task = await TaskModel.findById(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const plan = await UserPlanModel.addTask(userId, taskId);
      res.status(201).json(plan);
    } catch (error) {
      console.error('Error adding task to plan:', error);
      res.status(500).json({ error: 'Failed to add task to plan' });
    }
  },

  // Uses authMiddleware - requires auth (userId comes from JWT)
  async removeTaskFromPlan(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId as string;
      const userId = (req as any).userId as string;

      const removed = await UserPlanModel.removeTask(userId, taskId);

      if (!removed) {
        res.status(404).json({ error: 'Task not found in plan' });
        return;
      }

      res.json({ message: 'Task removed from plan' });
    } catch (error) {
      console.error('Error removing task from plan:', error);
      res.status(500).json({ error: 'Failed to remove task from plan' });
    }
  },

  // Uses authMiddleware - requires auth (userId comes from JWT)
  async toggleTaskComplete(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId as string;
      const userId = (req as any).userId as string;

      const plan = await UserPlanModel.toggleComplete(userId, taskId);

      if (!plan) {
        res.status(404).json({ error: 'Task not found in plan' });
        return;
      }

      res.json(plan);
    } catch (error) {
      console.error('Error toggling task completion:', error);
      res.status(500).json({ error: 'Failed to toggle task completion' });
    }
  },

  // Uses optionalAuthMiddleware - works with or without auth
  async getTaskIdsInPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string | undefined;
      
      // If not logged in, return empty array
      if (!userId) {
        res.json([]);
        return;
      }
      
      const taskIds = await UserPlanModel.getTaskIdsInPlan(userId);
      res.json(taskIds);
    } catch (error) {
      console.error('Error fetching task IDs:', error);
      res.status(500).json({ error: 'Failed to fetch task IDs' });
    }
  },

  // Complete task with cost input - awards points
  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId as string;
      const userId = (req as any).userId as string;
      const { cost } = req.body;

      const result = await UserPlanModel.completeTask(userId, taskId, cost);

      if (!result) {
        res.status(404).json({ error: 'Task not found in plan' });
        return;
      }

      res.json({
        plan: result.plan,
        pointsAwarded: result.pointsAwarded,
        message: result.pointsAwarded > 0 
          ? `Task completed! +${result.pointsAwarded} points` 
          : 'Task already completed',
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  },

  // Uncomplete task - removes points
  async uncompleteTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId as string;
      const userId = (req as any).userId as string;

      const plan = await UserPlanModel.uncompleteTask(userId, taskId);

      if (!plan) {
        res.status(404).json({ error: 'Task not found or not completed' });
        return;
      }

      res.json({ plan, message: 'Task marked as incomplete' });
    } catch (error) {
      console.error('Error uncompleting task:', error);
      res.status(500).json({ error: 'Failed to uncomplete task' });
    }
  },

  // Get calendar data for a specific month
  async getCalendarData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string | undefined;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      if (!userId) {
        res.json([]);
        return;
      }

      const data = await UserPlanModel.getCalendarData(userId, year, month);
      res.json(data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
  },

  // Get user stats (points, total cost, etc.)
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string | undefined;

      if (!userId) {
        res.json({ totalPoints: 0, totalCost: 0, completedCount: 0 });
        return;
      }

      const stats = await UserPlanModel.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  },

  // Get point values configuration
  async getPointValues(req: Request, res: Response): Promise<void> {
    res.json(POINTS_BY_FREQUENCY);
  },
};
