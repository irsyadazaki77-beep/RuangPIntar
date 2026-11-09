import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import { pinVerificationLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// Session Token Authentication (FASE 1)
authRouter.post('/login', pinVerificationLimiter, AuthController.login);
authRouter.post('/logout', AuthController.logout);

// Legacy PIN verification endpoint
authRouter.post('/verify-pin', pinVerificationLimiter, AuthController.verifyPin);

// Protected Teacher Host Operations
authRouter.post('/change-pin', requireHostPin, AuthController.changePin);
authRouter.get('/export-package', requireHostPin, AuthController.exportPackage);
authRouter.post('/import-package', requireHostPin, AuthController.importPackage);
