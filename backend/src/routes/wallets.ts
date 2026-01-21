import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authMiddleware } from '../controllers/authController';

const router = Router();

// All wallet routes require authentication

// Master wallet CRUD
router.get('/', authMiddleware, walletController.getWallets);
router.post('/', authMiddleware, walletController.createWallet);
router.post('/upsert', authMiddleware, walletController.upsertWallet);
router.put('/:id', authMiddleware, walletController.updateWallet);
router.delete('/:id', authMiddleware, walletController.deleteWallet);

// Task-wallet assignments
router.get('/task-wallets', authMiddleware, walletController.getTaskWallets);
router.get('/tasks/:taskId', authMiddleware, walletController.getWalletsForTask);
router.post('/tasks/:taskId', authMiddleware, walletController.addWalletsToTask);
router.post('/tasks/:taskId/create-and-add', authMiddleware, walletController.createAndAddToTask);
router.delete('/tasks/:taskId/:walletId', authMiddleware, walletController.removeWalletFromTask);

export default router;
