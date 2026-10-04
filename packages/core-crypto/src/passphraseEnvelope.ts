import nacl from 'tweetnacl';
import { EncryptionService, PBKDF2_CONFIG } from './encryption';

export const MIN_VAULT_PASSPHRASE_LENGTH = 12;
// The envelope is stored on a server we do not trust with the key; cap the
// work factor so a tampered envelope cannot hang the unlock.
const MAX_ENVELOPE_ITERATIONS = PBKDF2_CONFIG.DEFAULT_ITERATIONS * 10;

/**
 * The master key sealed with a key derived from the user's vault passphrase.
 * Safe to store on the server: without the passphrase it reveals nothing.
 */
export interface PassphraseEnvelope {
  version: 1;
  keyId: string;
  iterations: number;
  salt: string;
  nonce: string;
  wrappedKey: string;
}

export class WrongVaultPassphraseError extends Error {
  constructor() {
    super('That passphrase does not unlock this vault.');
    this.name = 'WrongVaultPassphraseError';
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * A short fingerprint of the master key. Lets a device notice that its local
 * key is not the one the vault was sealed with, without opening the envelope.
 */
export function vaultKeyId(masterKey: Uint8Array): string {
  const label = new TextEncoder().encode('NC-VAULT-KEY-ID:');
  const input = new Uint8Array(label.length + masterKey.length);
  input.set(label);
  input.set(masterKey, label.length);
  return toBase64(nacl.hash(input).slice(0, 9));
}

export async function sealMasterKey(
  masterKey: Uint8Array,
  passphrase: string,
  iterations: number = PBKDF2_CONFIG.DEFAULT_ITERATIONS
): Promise<PassphraseEnvelope> {
  if (passphrase.length < MIN_VAULT_PASSPHRASE_LENGTH) {
    throw new Error(
      `Vault passphrases must be at least ${MIN_VAULT_PASSPHRASE_LENGTH} characters.`
    );
  }

  const salt = EncryptionService.generateSalt();
  const wrappingKey = await EncryptionService.deriveKey(passphrase, salt, iterations);
  const { ciphertext, nonce, authTag } = await EncryptionService.encrypt(masterKey, wrappingKey);

  const sealed = new Uint8Array(authTag.length + ciphertext.length);
  sealed.set(authTag);
  sealed.set(ciphertext, authTag.length);

  return {
    version: 1,
    keyId: vaultKeyId(masterKey),
    iterations,
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    wrappedKey: toBase64(sealed),
  };
}

export async function openMasterKey(
  envelope: PassphraseEnvelope,
  passphrase: string
): Promise<Uint8Array> {
  if (envelope.version !== 1) {
    throw new Error(`Unsupported vault envelope version: ${envelope.version}`);
  }
  if (envelope.iterations > MAX_ENVELOPE_ITERATIONS) {
    throw new Error('Vault envelope iteration count is out of range.');
  }

  const wrappingKey = await EncryptionService.deriveKey(
    passphrase,
    fromBase64(envelope.salt),
    envelope.iterations
  );
  const sealed = fromBase64(envelope.wrappedKey);

  try {
    return await EncryptionService.decrypt(
      sealed.slice(16),
      fromBase64(envelope.nonce),
      sealed.slice(0, 16),
      wrappingKey
    );
  } catch {
    throw new WrongVaultPassphraseError();
  }
}
