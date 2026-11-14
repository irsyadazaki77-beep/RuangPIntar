import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  hostPin: string;
  isEphemeralPin: boolean;
  geminiApiKey?: string;
  dbPath: string;
  mdnsHost: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const PIN_REGEX = /^\d{4,8}$/;

export function formatEphemeralPinBanner(generatedPin: string): string {
  return [
    '╔══════════════════════════════════════════════════════════════════╗',
    '║           ⚠️  PERINGATAN KEAMANAN SIMPUL GURU (DEV) ⚠️            ║',
    '╠══════════════════════════════════════════════════════════════════╣',
    '║ Variabel lingkungan HOST_PIN belum disetel atau tidak valid.     ║',
    `║ PIN Sementara Sesi Ini :  [ ${generatedPin} ]                             ║`,
    '║                                                                  ║',
    '║ Gunakan PIN 6 digit di atas untuk masuk ke panel Ruang Guru,     ║',
    '║ atau atur HOST_PIN=(4-8 digit angka) pada berkas .env Anda.      ║',
    '╚══════════════════════════════════════════════════════════════════╝',
  ].join('\n');
}

export function resolveHostPin(
  rawEnvPin: string | undefined = process.env.HOST_PIN,
  nodeEnv: string = process.env.NODE_ENV || 'development'
): { hostPin: string; isEphemeralPin: boolean } {
  const trimmedPin = (rawEnvPin || '').trim();

  if (PIN_REGEX.test(trimmedPin)) {
    return { hostPin: trimmedPin, isEphemeralPin: false };
  }

  if (nodeEnv === 'production') {
    const fatalMsg =
      '[FATAL CONFIG ERROR] Variabel lingkungan HOST_PIN belum disetel atau formatnya tidak valid (wajib 4-8 digit angka). ' +
      'Demi keamanan produksi Simpul Guru, proses booting dihentikan. Silakan setel HOST_PIN di berkas .env (contoh: HOST_PIN=482910).';
    console.error(`\n❌ ${fatalMsg}\n`);
    throw new Error(fatalMsg);
  }

  const randomPin = crypto.randomInt(100000, 999999).toString();
  console.warn(`\n${formatEphemeralPinBanner(randomPin)}\n`);
  return { hostPin: randomPin, isEphemeralPin: true };
}

const rawDbPath = (process.env.RUANGPINTAR_DB_PATH || '').trim();
const defaultDbFile = path.resolve(process.cwd(), 'ruangpintar-edge.db');
const resolvedDbPath = /\.(db|sqlite|sqlite3)$/i.test(rawDbPath) ? rawDbPath : defaultDbFile;

const activeNodeEnv = process.env.NODE_ENV || 'development';
const { hostPin, isEphemeralPin } = resolveHostPin(process.env.HOST_PIN, activeNodeEnv);

export const config: ServerConfig = {
  port: Number(process.env.PORT) || 3000,
  host: '0.0.0.0',
  nodeEnv: activeNodeEnv,
  hostPin,
  isEphemeralPin,
  geminiApiKey: process.env.GEMINI_API_KEY,
  dbPath: resolvedDbPath,
  mdnsHost: 'ruangpintar.local',
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 120, // max 120 requests per minute from local student nodes
};

export const SECURITY_CONSTANTS = {
  MAX_PIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 60 * 1000, // 60 seconds
  SESSION_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours (1 school day session)
  MAX_REQUEST_BODY_SIZE: '2mb',
} as const;


