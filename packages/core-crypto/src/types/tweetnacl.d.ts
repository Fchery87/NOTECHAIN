declare module 'tweetnacl' {
  export interface BoxKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface SignKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export interface Nacl {
    // Secretbox (symmetric encryption)
    secretbox: {
      (message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
      open(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
      keyLength: 32;
      nonceLength: 24;
      overheadLength: 16;
    };

    // Box (asymmetric encryption)
    box: {
      (
        message: Uint8Array,
        nonce: Uint8Array,
        publicKey: Uint8Array,
        secretKey: Uint8Array
      ): Uint8Array | null;
      open(
        ciphertext: Uint8Array,
        nonce: Uint8Array,
        publicKey: Uint8Array,
        secretKey: Uint8Array
      ): Uint8Array | null;
      before(publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array;
      after(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
      openAfter(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
      keyPair(): BoxKeyPair;
      keyPairFromSecretKey(secretKey: Uint8Array): BoxKeyPair;
      publicKeyLength: 32;
      secretKeyLength: 32;
      nonceLength: 24;
      overheadLength: 16;
    };

    // Signatures
    sign: {
      (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
      open(signedMessage: Uint8Array, publicKey: Uint8Array): Uint8Array | null;
      detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
      detachedVerify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
      keyPair(): SignKeyPair;
      keyPairFromSecretKey(secretKey: Uint8Array): SignKeyPair;
      keyPairFromSeed(seed: Uint8Array): SignKeyPair;
      publicKeyLength: 32;
      secretKeyLength: 64;
      seedLength: 32;
      signatureLength: 64;
    };

    // Hash
    hash(message: Uint8Array): Uint8Array;
    hashBytes: 64;

    // Random bytes
    randomBytes(length: number): Uint8Array;

    // Scalar multiplication
    scalarMult: {
      (n: Uint8Array, p: Uint8Array): Uint8Array;
      base(n: Uint8Array): Uint8Array;
      scalarLength: 32;
      groupElementLength: 32;
    };

    // Utilities
    verify(x: Uint8Array, y: Uint8Array): boolean;
    setPRNG(prng: (length: number) => Uint8Array): void;
  }

  const nacl: Nacl;
  export default nacl;
}
