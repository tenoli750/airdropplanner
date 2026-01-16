import { Router } from 'express';
import { planController } from '../controllers/planController';
import { authMiddleware, optionalAuthMiddleware } from '../controllers/authController';

const router = Router();

// Public routes (work with or without auth)
router.get('/', optionalAuthMiddleware, planController.getUserPlan);
router.get('/task-ids', optionalAuthMiddleware, planController.getTaskIdsInPlan);
router.get('/calendar', optionalAuthMiddleware, planController.getCalendarData);
router.get('/stats', optionalAuthMiddleware, planController.getUserStats);
router.get('/point-values', planController.getPointValues);

// Protected routes (require auth)
router.post('/', authMiddleware, planController.addTaskToPlan);
router.delete('/:taskId', authMiddleware, planController.removeTaskFromPlan);
router.patch('/:taskId/toggle', authMiddleware, planController.toggleTaskComplete);
router.post('/:taskId/complete', authMiddleware, planController.completeTask);
router.post('/:taskId/uncomplete', authMiddleware, planController.uncompleteTask);

export default router;
