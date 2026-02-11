# @notechain/core-crypto

Shared cryptographic operations for NoteChain using libsodium.

## Exports

- `encrypt(plaintext, key)` - AES-256-GCM encryption
- `decrypt(ciphertext, key, nonce, tag)` - Decryption
- `generateKey()` - Generate encryption key
- `deriveKey(password, salt)` - PBKDF2 key derivation
- `hash(data)` - BLAKE2b hashing
- `sign(message, keyPair)` - Ed25519 signatures
- `verify(message, signature, publicKey)` - Signature verification

## Dependencies

| Dependency         | Purpose                  |
| ------------------ | ------------------------ |
| libsodium-wrappers | Cryptographic primitives |

## Usage

```typescript
import { encrypt, decrypt, generateKey } from '@notechain/core-crypto';

const key = generateKey();
const { ciphertext, nonce, tag } = encrypt('Hello, NoteChain!', key);
const plaintext = decrypt(ciphertext, key, nonce, tag);
```
