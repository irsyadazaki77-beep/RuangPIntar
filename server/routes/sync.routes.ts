import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';
import {
  packageTransferLimiter,
  packageImportLimiter,
} from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  ProgressSyncSchema,
  TransferPackageSchema,
  ClientChunksSyncSchema,
  SneakernetImportSchema,
  DistributeAllSchema,
  ClassroomBroadcastSchema,
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
  packageImportLimiter,
  requireHostPin,
  validateBody(SneakernetImportSchema),
  SyncController.importPackage
);

// Gateway tethering control (Protected by Teacher PIN)
syncRouter.post('/gateway/toggle', requireHostPin, SyncController.toggleGateway);

// Publish module (Protected by Teacher PIN)
syncRouter.post('/modules', requireHostPin, SyncController.publishModule);

// One-click distribute module to all connected student peers (Protected by Teacher PIN)
syncRouter.post(
  '/distribute-all',
  requireHostPin,
  validateBody(DistributeAllSchema),
  SyncController.distributeToAll
);

// Classroom announcement, focus module & exam mode broadcast (Protected by Teacher PIN)
syncRouter.post(
  '/broadcast',
  requireHostPin,
  validateBody(ClassroomBroadcastSchema),
  SyncController.setClassroomBroadcast
);

// Host network & QR discovery info
syncRouter.get('/host/network-info', SyncController.getNetworkInfo);

