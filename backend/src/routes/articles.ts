import { Router } from 'express';
import { articleController } from '../controllers/articleController';

const router = Router();

router.get('/', articleController.getAllArticles);
router.get('/:id', articleController.getArticleById);
router.get('/:id/tasks', articleController.getTasksByArticleId);

export default router;
