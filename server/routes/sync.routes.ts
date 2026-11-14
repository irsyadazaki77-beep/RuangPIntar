import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import { packageTransferLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  ProgressSyncSchema,
  TransferPackageSchema,
  ClientChunksSyncSchema,
  SneakernetImportSchema,
} from '../schemas/sync.schema.js';

export const syncRouter = Router();

// Classroom state
syncRouter.get('/state', SyncController.getState);

// Student gradebook & progress submission (Zod validated)
syncRouter.post(
  '/students/sync-submission',
  validateBody(ProgressSyncSchema),
  SyncController.syncSubmission
);
syncRouter.post(
  '/progress',
  validateBody(ProgressSyncSchema),
  SyncController.syncSubmission
);

// P2P WebRTC mesh synchronization (Zod validated, no dummy fallbacks)
syncRouter.post(
  '/p2p/sync-client-chunks',
  validateBody(ClientChunksSyncSchema),
  SyncController.syncClientChunks
);
syncRouter.post(
  '/p2p/transfer-step',
  validateBody(TransferPackageSchema),
  SyncController.transferStep
);
syncRouter.post(
  '/p2p/reset-peer',
  validateBody(TransferPackageSchema),
  SyncController.resetPeer
);

// Sneakernet Package Export / Import (Rate limited + Protected by Teacher PIN)
syncRouter.get(
  '/export-package',
  packageTransferLimiter,
  requireHostPin,
  SyncController.exportPackage
);
syncRouter.post(
  '/export-package',
  packageTransferLimiter,
  requireHostPin,
  SyncController.exportPackage
);
syncRouter.post(
  '/import-package',
  packageTransferLimiter,
  requireHostPin,
  validateBody(SneakernetImportSchema),
  SyncController.importPackage
);

// Gateway tethering control (Protected by Teacher PIN)
syncRouter.post('/gateway/toggle', requireHostPin, SyncController.toggleGateway);

// Publish module (Protected by Teacher PIN)
syncRouter.post('/modules', requireHostPin, SyncController.publishModule);

// Host network & QR discovery info
syncRouter.get('/host/network-info', SyncController.getNetworkInfo);

