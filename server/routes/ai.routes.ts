import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import { aiTutorLimiter } from '../middleware/rateLimiter.js';

export const aiRouter = Router();

aiRouter.post('/ask', aiTutorLimiter, AiController.askQuestion);
aiRouter.post('/seed', requireHostPin, AiController.seedCache);
aiRouter.post('/process-queue', requireHostPin, AiController.processPendingQueue);
aiRouter.delete('/queue/:id', requireHostPin, AiController.dismissPendingQuestion);
