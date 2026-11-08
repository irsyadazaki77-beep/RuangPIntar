import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import { pinVerificationLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/verify-pin', pinVerificationLimiter, AuthController.verifyPin);
authRouter.post('/change-pin', requireHostPin, AuthController.changePin);
authRouter.get('/export-package', requireHostPin, AuthController.exportPackage);
authRouter.post('/import-package', requireHostPin, AuthController.importPackage);
