import { Router } from 'express';
import { adminController } from '../controllers/adminController';

const router = Router();

// Article routes
router.post('/articles', adminController.createArticle);
router.put('/articles/:id', adminController.updateArticle);
router.delete('/articles/:id', adminController.deleteArticle);

// Task routes
router.get('/tasks/:id', adminController.getTask);
router.post('/tasks', adminController.createTask);
router.put('/tasks/:id', adminController.updateTask);
router.delete('/tasks/:id', adminController.deleteTask);

export default router;
