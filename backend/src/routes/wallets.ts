import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authMiddleware } from '../controllers/authController';

const router = Router();

// All wallet routes require authentication
router.get('/', authMiddleware, walletController.getWallets);
router.post('/', authMiddleware, walletController.createWallet);
router.put('/:id', authMiddleware, walletController.updateWallet);
router.delete('/:id', authMiddleware, walletController.deleteWallet);

export default router;
