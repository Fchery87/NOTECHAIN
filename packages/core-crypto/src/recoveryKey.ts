import nacl from 'tweetnacl';

const RECOVERY_KEY_VERSION = 'NC-RK1';
const EXPECTED_MASTER_KEY_LENGTH = 32;
const CHECKSUM_LENGTH_BYTES = 6;

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const length = arrays.reduce((total, array) => total + array.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;

  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return new Uint8Array(Buffer.from(padded, 'base64'));
}

function timingSafeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let i = 0; i < maxLength; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return diff === 0;
}

function checksumForMasterKey(masterKey: Uint8Array): string {
  const domainSeparatedInput = concatBytes(
    utf8Bytes(`${RECOVERY_KEY_VERSION}:checksum:`),
    masterKey
  );
  const hash = nacl.hash(domainSeparatedInput);
  return bytesToBase64Url(hash.slice(0, CHECKSUM_LENGTH_BYTES));
}

export function encodeRecoveryKey(masterKey: Uint8Array): string {
  if (masterKey.length !== EXPECTED_MASTER_KEY_LENGTH) {
    throw new Error(
      `Recovery keys require a ${EXPECTED_MASTER_KEY_LENGTH}-byte master key; received ${masterKey.length} bytes`
    );
  }

  const payload = bytesToBase64Url(masterKey);
  const checksum = checksumForMasterKey(masterKey);
  return `${RECOVERY_KEY_VERSION}:${payload}:${checksum}`;
}

export function decodeRecoveryKey(recoveryKey: string): Uint8Array {
  const normalized = recoveryKey.trim();
  const parts = normalized.split(':');

  if (parts.length !== 3 || parts[0] !== RECOVERY_KEY_VERSION) {
    throw new Error('Invalid NoteChain recovery key format');
  }

  const [, payload, checksum] = parts;
  const masterKey = base64UrlToBytes(payload);

  if (masterKey.length !== EXPECTED_MASTER_KEY_LENGTH) {
    throw new Error('Invalid NoteChain recovery key length');
  }

  const expectedChecksum = checksumForMasterKey(masterKey);
  if (!timingSafeEqual(checksum, expectedChecksum)) {
    throw new Error('Invalid NoteChain recovery key checksum');
  }

  return masterKey;
}

export function isValidRecoveryKey(recoveryKey: string): boolean {
  try {
    decodeRecoveryKey(recoveryKey);
    return true;
  } catch {
    return false;
  }
}
