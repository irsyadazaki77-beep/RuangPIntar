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
