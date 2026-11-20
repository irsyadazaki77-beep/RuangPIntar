import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import { aiTutorLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CacheEntryUpdateSchema } from '../schemas/sync.schema.js';

export const aiRouter = Router();

aiRouter.post('/ask', aiTutorLimiter, AiController.askQuestion);
aiRouter.post('/seed', requireHostPin, AiController.seedCache);
aiRouter.put(
  '/:id',
  requireHostPin,
  validateBody(CacheEntryUpdateSchema),
  AiController.updateCacheEntry
);
aiRouter.delete('/:id', requireHostPin, AiController.deleteCacheEntry);
aiRouter.post('/process-queue', requireHostPin, AiController.processPendingQueue);
aiRouter.delete('/queue/:id', requireHostPin, AiController.dismissPendingQuestion);
