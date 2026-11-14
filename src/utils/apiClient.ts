import { loadCustomHostUrl } from './clientStorage';

/**
 * Resolves the active Teacher Host base URL (from QR Scanner / custom host config)
 * or falls back to relative same-origin paths.
 */
export function resolveApiBaseUrl(explicitHostUrl?: string | null): string {
  const candidate = (explicitHostUrl ?? loadCustomHostUrl() ?? '').trim().replace(/\/+$/, '');
  if (!candidate) return '';

  // Avoid cross-origin mismatches when already on the exact same origin
  if (typeof window !== 'undefined' && window.location?.origin === candidate) {
    return '';
  }
  return candidate;
}

/**
 * Unified fetch wrapper that respects customHostUrl scanned via QR Code.
 */
export function apiFetch(
  path: string,
  init?: RequestInit,
  explicitHostUrl?: string | null
): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = resolveApiBaseUrl(explicitHostUrl);
  return fetch(`${baseUrl}${normalizedPath}`, init);
}

/**
 * Safely parses JSON responses without throwing on empty or HTML fallback pages.
 */
export async function safeParseJson(res: Response): Promise<Record<string, any>> {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return {};
    }
    return JSON.parse(text);
  } catch {
    return {};
  }
}
