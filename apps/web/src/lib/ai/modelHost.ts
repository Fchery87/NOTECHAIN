export const LOCAL_MODEL_PATH = '/models/';

export function parseModelHost(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.username || url.password) return null;

  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol === 'https:' || (url.protocol === 'http:' && isLocalhost)) {
    return url.origin;
  }
  return null;
}

export function configuredModelHost(): string | null {
  return parseModelHost(process.env.NEXT_PUBLIC_MODEL_HOST);
}

export interface ModelEnvPatch {
  allowLocalModels: boolean;
  allowRemoteModels: boolean;
  localModelPath?: string;
  remoteHost?: string;
  remotePathTemplate?: string;
}

/**
 * On-device models load from exactly one place, so a missing host never
 * falls back to a third-party CDN. A host serves files as
 * `<host>/<model id>/<file>`.
 */
export function modelEnvPatch(host: string | null): ModelEnvPatch {
  if (!host) {
    return { allowLocalModels: true, allowRemoteModels: false, localModelPath: LOCAL_MODEL_PATH };
  }
  return {
    allowLocalModels: false,
    allowRemoteModels: true,
    remoteHost: `${host}/`,
    remotePathTemplate: '{model}/',
  };
}
