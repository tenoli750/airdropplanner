import { Router } from 'express';
import { bettingController } from '../controllers/bettingController';
import { authMiddleware, optionalAuthMiddleware } from '../controllers/authController';

const router = Router();

// Main endpoint - get all betting data (active race, betting race, history)
router.get('/data', optionalAuthMiddleware, bettingController.getBettingData);

// Place a bet (requires auth)
router.post('/place-bet', authMiddleware, bettingController.placeBet);

// Get user balance (requires auth)
router.get('/balance', authMiddleware, bettingController.getBalance);

// Get leaderboard (optional auth to show current user's rank)
router.get('/leaderboard', optionalAuthMiddleware, bettingController.getLeaderboard);

export default router;
