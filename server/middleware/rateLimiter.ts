import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * Limits aggressive polling from local classroom peers (max 120 req / minute).
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Terlalu banyak permintaan ke Simpul Guru. Harap tunggu beberapa saat.',
  },
});

/**
 * AI Tutor Rate Limiter
 * Restricts AI tutor questions to prevent starvation and API key abuse (max 20 questions / minute).
 */
export const aiTutorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Batas frekuensi pertanyaan AI Tutor tercapai. Mohon tunggu 1 menit.',
  },
});

/**
 * Strict PIN Verification Limiter
 * Protects teacher node against brute force PIN guessing.
 */
export const pinVerificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    valid: false,
    error: 'Terlalu banyak percobaan otentikasi PIN. Akses dibatasi sementara.',
  },
});

/**
 * Dedicated limiter for PIN rotation so /change-pin rate limits don't lock out /login.
 */
export const changePinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    valid: false,
    error: 'Terlalu banyak percobaan otentikasi PIN. Akses dibatasi sementara.',
  },
});

/**
 * Package Transfer (Export / Import Sneakernet) Rate Limiter
 * Window: 5 minutes, max 10 requests per IP.
 */
export const packageTransferLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    success: false,
    error: 'Terlalu banyak permintaan ekspor/impor paket. Silakan coba beberapa saat lagi.',
  },
});

/**
 * Separate limiter for Sneakernet package imports so package exports do not
 * exhaust the import allowance.
 */
export const packageImportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    success: false,
    error: 'Terlalu banyak permintaan ekspor/impor paket. Silakan coba beberapa saat lagi.',
  },
});

