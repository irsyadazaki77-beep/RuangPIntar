import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { requireHostPin } from '../middleware/authMiddleware.js';

export const syncRouter = Router();

// Classroom state
syncRouter.get('/state', SyncController.getState);

// Student gradebook submission
syncRouter.post('/students/sync-submission', SyncController.syncSubmission);

// P2P WebRTC mesh synchronization
syncRouter.post('/p2p/sync-client-chunks', SyncController.syncClientChunks);
syncRouter.post('/p2p/transfer-step', SyncController.transferStep);
syncRouter.post('/p2p/reset-peer', SyncController.resetPeer);

// Gateway tethering control (Protected by Teacher PIN)
syncRouter.post('/gateway/toggle', requireHostPin, SyncController.toggleGateway);

// Publish module (Protected by Teacher PIN)
syncRouter.post('/modules', requireHostPin, SyncController.publishModule);

// Host network & QR discovery info
syncRouter.get('/host/network-info', SyncController.getNetworkInfo);
