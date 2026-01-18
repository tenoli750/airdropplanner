import { Router } from 'express';
import { blogController } from '../controllers/blogController';
import { authMiddleware } from '../controllers/authController';

const router = Router();

// Public routes
router.get('/', blogController.getPosts);
router.get('/:id', blogController.getPost);

// Protected routes (admin only)
router.post('/', authMiddleware, blogController.createPost);
router.put('/:id', authMiddleware, blogController.updatePost);
router.delete('/:id', authMiddleware, blogController.deletePost);

export default router;
