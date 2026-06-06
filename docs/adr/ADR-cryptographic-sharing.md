# ADR: Cryptographic Sharing Model

Status: Accepted for implementation planning  
Date: 2026-06-04

## Context

NoteChain is privacy-first and local-first. Collaboration and sharing must not weaken the core claim that the server cannot decrypt note content. Existing collaboration code must therefore be treated as prototype-level until it is backed by a cryptographic sharing model and server-side authorization.

## Decision

NoteChain will use per-document content keys and recipient-specific key wrapping for encrypted sharing.

## Key hierarchy

1. **User root/master key**
   - Created locally and recoverable through the user's recovery key.
   - Never uploaded in plaintext.

2. **Device key pair**
   - Each trusted device has a public/private encryption key pair.
   - Public key can be uploaded for collaborators to wrap document keys.
   - Private key remains local and is protected by the user's local key material.

3. **Document content key**
   - Each shared document/note has a random symmetric content key.
   - The document payload is encrypted with this content key.
   - The server stores only ciphertext and metadata needed for authorization and sync.

4. **Recipient key package**
   - The document content key is wrapped for each authorized recipient device.
   - A recipient can decrypt only if they possess the matching private device key.

## Sharing flow

1. Owner creates or upgrades a note to shared mode.
2. Client generates a random document content key.
3. Existing note payload is re-encrypted with the content key.
4. For each collaborator device, the owner wraps the content key to the collaborator's public device key.
5. Server stores:
   - encrypted document payload;
   - access-control row for collaborator identity;
   - encrypted key package per collaborator device;
   - share role metadata.
6. Collaborator fetches encrypted payload and their key package.
7. Collaborator unwraps the content key locally and decrypts the document locally.

## Share links

Share links must use explicit cryptographic packages, not authorization-only URLs.

A share-link package contains:

- link id;
- encrypted document content key or invitation secret;
- expiration timestamp;
- optional max-use count;
- optional passphrase-derived wrapping key;
- intended role/scope;
- server-side access policy reference.

Share links must expire. Long-lived public decrypt URLs are not allowed.

## Revocation model

Revocation guarantees are forward-looking.

When a collaborator or device is revoked:

1. Server authorization is removed immediately.
2. Future sync/realtime access is denied.
3. Document content key is rotated for future versions.
4. The new content key is wrapped only for remaining authorized devices.
5. Existing ciphertext may be re-encrypted opportunistically or as a background job.

Limitations:

- Already-downloaded plaintext cannot be clawed back.
- Already-downloaded old ciphertext plus an old content key may remain decryptable to a revoked device.
- Product UI must communicate that revocation protects future access and future updates, not memories or copied data.

## Server authorization requirements

Server-side checks are mandatory even though content is encrypted.

The server must verify:

- user can list document metadata only if authorized;
- user can fetch encrypted payload only if authorized;
- user can fetch key package only for their own device/user identity;
- user can join realtime collaboration channel only if authorized;
- user can write operations only if their role permits writing;
- share links are unexpired and under max-use before granting access.

Unauthorized websocket joins must be rejected before channel subscription.

## Operation history and realtime

Realtime collaboration must be durable.

Accepted implementation choices:

1. Adopt a mature CRDT such as Yjs or Automerge and persist encrypted updates; or
2. Keep version-based editing and explicitly avoid multi-cursor realtime editing.

Volatile broadcast-only collaboration is not production-acceptable.

## Non-goals for the first implementation slice

- Perfect retroactive revocation.
- Server-side plaintext processing.
- Public permanent decrypt links.
- Sharing without server authorization.

## Acceptance gates before collaboration launch

- Per-document content key implementation exists.
- Recipient key wrapping exists.
- Server authorization checks are tested.
- Unauthorized realtime join is tested.
- Revocation rotates future document keys.
- Product copy documents revocation limits.
