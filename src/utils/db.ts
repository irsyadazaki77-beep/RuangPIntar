/**
 * Re-exports from modularized SQLite Data Access Layer in server/db
 * Maintained for backward compatibility across test files and client utilities.
 */
export {
  getDatabase,
  closeDatabase,
  ModuleRepository,
  CacheRepository,
  QuizRepository,
  PeerRepository,
  TransferRepository,
  HostConfigRepository,
  saveModuleToDb,
  loadModulesFromDb,
  saveCacheEntryToDb,
  loadCacheEntriesFromDb,
  insertTransferLogToDb,
  loadTransferLogsFromDb,
  savePeersToDb,
  loadPeersFromDb,
  getHostConfig,
  setHostConfig,
  saveStudentSubmission,
  loadStudentSubmissions,
  exportSneakernetPackage,
  importSneakernetPackage,
  ensureDatabaseSeeded,
} from '../../server/db/index.js';
