export interface EncryptionKeys {
  masterKey: Uint8Array;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  publicKey: Uint8Array;
}

export declare function generateKeyPair(): Promise<EncryptionKeys>;
export declare function encryptData(
  message: Uint8Array,
  recipientPublicKey: Uint8Array
): Promise<EncryptedData>;
export declare function decryptData(
  encrypted: EncryptedData,
  secretKey: Uint8Array
): Promise<Uint8Array>;
export declare function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array>;
export declare function generateSalt(): Uint8Array;
