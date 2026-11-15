import crypto from 'crypto';
import { DeviceRepository } from '../db/repositories/device.repository.js';

export interface VerifySignatureResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verifies a cryptographic student signature using ECDSA P-256 (SHA-256).
 * Enforces anti-impersonation: if a studentId is already registered with a public key,
 * subsequent requests MUST match that registered public key and signature.
 */
export function verifyStudentSignature(
  studentId: string,
  payloadString: string,
  signatureBase64?: string,
  publicKeyBase64?: string,
  studentName = 'Siswa RuangPintar'
): VerifySignatureResult {
  if (!signatureBase64 || !publicKeyBase64) {
    // If signature is missing, check if studentId was already bound to a registered key.
    // If bound, an unsigned request is rejected to prevent impersonation.
    const existing = DeviceRepository.findByStudentId(studentId);
    if (existing) {
      return {
        valid: false,
        reason: `ID Siswa ${studentId} telah didaftarkan dengan tanda tangan perangkat. Pengiriman tanpa tanda tangan ditolak.`,
      };
    }
    // Unregistered legacy client (allowed for backwards compatibility)
    return { valid: true };
  }

  try {
    const existing = DeviceRepository.findByStudentId(studentId);
    if (existing && existing.publicKeySpki !== publicKeyBase64) {
      return {
        valid: false,
        reason: `Kunci publik perangkat tidak cocok dengan perangkat terdaftar untuk ${studentId} (indikasi pemalsuan identitas).`,
      };
    }

    const pubKeyDer = Buffer.from(publicKeyBase64, 'base64');
    const sigDer = Buffer.from(signatureBase64, 'base64');

    const verify = crypto.createVerify('SHA256');
    verify.update(Buffer.from(payloadString, 'utf8'));
    verify.end();

    const isSigValid = verify.verify(
      {
        key: pubKeyDer,
        format: 'der',
        type: 'spki',
      },
      sigDer
    );

    if (!isSigValid) {
      return {
        valid: false,
        reason: 'Tanda tangan digital tidak valid atau payload telah dimanipulasi.',
      };
    }

    // Auto-register device if first time seen
    if (!existing) {
      DeviceRepository.register({
        studentId,
        publicKeySpki: publicKeyBase64,
        deviceName: studentName,
        registeredAt: new Date().toISOString(),
        registeredMs: Date.now(),
      });
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      reason: `Gagal memvalidasi tanda tangan kriptografis: ${(err as Error).message}`,
    };
  }
}
