import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { SyncController } from '../controllers/sync.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { SneakernetImportSchema } from '../schemas/sync.schema.js';
import {
  pinVerificationLimiter,
  changePinLimiter,
  packageTransferLimiter,
  packageImportLimiter,
} from '../middleware/rateLimiter.js';

export const authRouter = Router();

// Session Token Authentication
authRouter.post('/login', pinVerificationLimiter, AuthController.login);
authRouter.post('/logout', AuthController.logout);

// Legacy PIN verification endpoint
authRouter.post('/verify-pin', pinVerificationLimiter, AuthController.verifyPin);

// Protected Teacher Host Operations
authRouter.post(
  '/change-pin',
  changePinLimiter,
  requireHostPin,
  AuthController.changePin
);
authRouter.get(
  '/export-package',
  packageTransferLimiter,
  requireHostPin,
  SyncController.exportPackage
);
authRouter.post(
  '/export-package',
  packageTransferLimiter,
  requireHostPin,
  SyncController.exportPackage
);
authRouter.post(
  '/import-package',
  packageImportLimiter,
  requireHostPin,
  validateBody(SneakernetImportSchema),
  SyncController.importPackage
);

