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
  DiscussionCreateSchema,
  ModuleUpdateSchema,
  SubmissionUpdateSchema,
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
syncRouter.put(
  '/submissions/:id',
  requireHostPin,
  validateBody(SubmissionUpdateSchema),
  SyncController.updateSubmission
);
syncRouter.delete(
  '/submissions/:id',
  requireHostPin,
  SyncController.deleteSubmission
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
syncRouter.delete('/peers/:id', requireHostPin, SyncController.deletePeer);

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

// Module CRUD (Protected by Teacher PIN)
syncRouter.post('/modules', requireHostPin, SyncController.publishModule);
syncRouter.put(
  '/modules/:id',
  requireHostPin,
  validateBody(ModuleUpdateSchema),
  SyncController.updateModule
);
syncRouter.delete('/modules/:id', requireHostPin, SyncController.deleteModule);

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

// Local zero-quota course discussion board per module
syncRouter.get('/discussions', SyncController.listDiscussions);
syncRouter.post(
  '/discussions',
  validateBody(DiscussionCreateSchema),
  SyncController.createDiscussion
);
syncRouter.post(
  '/discussions/:id/pin',
  requireHostPin,
  SyncController.togglePinDiscussion
);
syncRouter.delete(
  '/discussions/:id',
  requireHostPin,
  SyncController.deleteDiscussion
);

// Host network & QR discovery info
syncRouter.get('/host/network-info', SyncController.getNetworkInfo);

