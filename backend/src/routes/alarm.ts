import { Router } from 'express';
import { alarmController } from '../controllers/alarmController';
import { authMiddleware } from '../controllers/authController';

const router = Router();

// All alarm routes require authentication
router.get('/settings', authMiddleware, alarmController.getSettings);
router.put('/settings', authMiddleware, alarmController.updateSettings);

export default router;
