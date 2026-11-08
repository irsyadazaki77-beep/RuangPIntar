import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  hostPin: string;
  geminiApiKey?: string;
  dbPath: string;
  mdnsHost: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const rawDbPath = (process.env.RUANGPINTAR_DB_PATH || '').trim();
const defaultDbFile = path.resolve(process.cwd(), 'ruangpintar-edge.db');
const resolvedDbPath = /\.(db|sqlite|sqlite3)$/i.test(rawDbPath) ? rawDbPath : defaultDbFile;

const rawPin = (process.env.HOST_PIN || '').trim();
const defaultPin = /^\d{4,8}$/.test(rawPin) ? rawPin : '1945';

export const config: ServerConfig = {
  port: Number(process.env.PORT) || 3000,
  host: '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  hostPin: defaultPin,
  geminiApiKey: process.env.GEMINI_API_KEY,
  dbPath: resolvedDbPath,
  mdnsHost: 'ruangpintar.local',
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 120, // max 120 requests per minute from local student nodes
};

export const SECURITY_CONSTANTS = {
  MAX_PIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 60 * 1000, // 60 seconds
  MAX_REQUEST_BODY_SIZE: '2mb',
} as const;
