import { Bonjour } from 'bonjour-service';

export interface MdnsDiscoveryHandle {
  stop: () => void;
}

/**
 * Publishes an mDNS/Bonjour service on the local network
 * so students can discover the teacher host at `ruangpintar.local:PORT`
 * without needing to know or type the dynamic numeric IP address.
 */
export function startMdnsDiscovery(
  port: number,
  serviceName = 'RuangPintar Edge Simpul Guru'
): MdnsDiscoveryHandle {
  try {
    const bonjour = new Bonjour();
    const service = bonjour.publish({
      name: serviceName,
      type: 'http',
      port,
      host: 'ruangpintar.local',
      txt: {
        app: 'ruangpintar-edge',
        role: 'teacher-host',
        version: '1.0.0',
        platform: '3T-offline-first',
      },
    });

    service.on('error', (err) => {
      console.warn('[mDNS] Bonjour service warning:', err.message);
    });

    console.log(`[mDNS] Memancarkan layanan lokal mDNS: http://ruangpintar.local:${port}`);

    return {
      stop: () => {
        try {
          bonjour.unpublishAll(() => {
            bonjour.destroy();
          });
        } catch {
          // Ignore shutdown errors
        }
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[mDNS] mDNS discovery tidak dapat diaktifkan pada lingkungan ini:', msg);
    return {
      stop: () => {},
    };
  }
}
