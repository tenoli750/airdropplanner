import { Router } from 'express';
import { authController, authMiddleware } from '../controllers/authController';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.get('/profile', authMiddleware, authController.getMe); // Alias for /me
router.post('/telegram/generate-code', authMiddleware, authController.generateLinkCode);
router.delete('/telegram/unlink', authMiddleware, authController.unlinkTelegram);

export default router;
