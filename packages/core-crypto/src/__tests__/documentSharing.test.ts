import { describe, expect, test } from 'bun:test';
import {
  activeRecipientKeyPackages,
  decryptDocumentPayload,
  deserializeRecipientKeyPackage,
  DOCUMENT_CONTENT_KEY_BYTES,
  encryptDocumentPayload,
  generateDocumentContentKey,
  revokeRecipientKeyPackage,
  serializeRecipientKeyPackage,
  unwrapDocumentContentKeyForRecipient,
  wrapDocumentContentKeyForRecipient,
} from '../documentSharing';
import { EncryptionService } from '../encryption';

describe('document sharing primitives', () => {
  test('generates document content keys and encrypts document payloads', async () => {
    const contentKey = await generateDocumentContentKey();
    expect(contentKey.length).toBe(DOCUMENT_CONTENT_KEY_BYTES);

    const plaintext = new TextEncoder().encode('shared note body');
    const encrypted = await encryptDocumentPayload(plaintext, contentKey);
    const decrypted = await decryptDocumentPayload(encrypted, contentKey);

    expect(new TextDecoder().decode(decrypted)).toBe('shared note body');
  });

  test('wraps and unwraps document content keys for a recipient device', async () => {
    const contentKey = await generateDocumentContentKey();
    const recipientWrappingKey = await EncryptionService.generateKey();

    const keyPackage = await wrapDocumentContentKeyForRecipient({
      documentId: 'doc-1',
      recipientId: 'user-2',
      recipientDeviceId: 'device-2a',
      documentContentKey: contentKey,
      recipientWrappingKey,
      createdAt: '2026-06-01T00:00:00.000Z',
    });

    const unwrapped = await unwrapDocumentContentKeyForRecipient(keyPackage, recipientWrappingKey);

    expect(Array.from(unwrapped)).toEqual(Array.from(contentKey));
    expect(keyPackage).toMatchObject({
      documentId: 'doc-1',
      recipientId: 'user-2',
      recipientDeviceId: 'device-2a',
      createdAt: '2026-06-01T00:00:00.000Z',
    });
  });

  test('serializes and deserializes recipient key packages', async () => {
    const contentKey = await generateDocumentContentKey();
    const recipientWrappingKey = await EncryptionService.generateKey();
    const keyPackage = await wrapDocumentContentKeyForRecipient({
      documentId: 'doc-1',
      recipientId: 'user-2',
      recipientDeviceId: 'device-2a',
      documentContentKey: contentKey,
      recipientWrappingKey,
    });

    const serialized = serializeRecipientKeyPackage(keyPackage);
    expect(typeof serialized.wrappedKey.ciphertext).toBe('string');

    const deserialized = deserializeRecipientKeyPackage(serialized);
    const unwrapped = await unwrapDocumentContentKeyForRecipient(
      deserialized,
      recipientWrappingKey
    );

    expect(Array.from(unwrapped)).toEqual(Array.from(contentKey));
  });

  test('filters and blocks revoked recipient key packages', async () => {
    const contentKey = await generateDocumentContentKey();
    const wrappingKey = await EncryptionService.generateKey();
    const activePackage = await wrapDocumentContentKeyForRecipient({
      documentId: 'doc-1',
      recipientId: 'user-2',
      recipientDeviceId: 'device-active',
      documentContentKey: contentKey,
      recipientWrappingKey: wrappingKey,
    });
    const revokedPackage = revokeRecipientKeyPackage(
      await wrapDocumentContentKeyForRecipient({
        documentId: 'doc-1',
        recipientId: 'user-2',
        recipientDeviceId: 'device-revoked',
        documentContentKey: contentKey,
        recipientWrappingKey: wrappingKey,
      }),
      '2026-06-02T00:00:00.000Z'
    );

    expect(activeRecipientKeyPackages([activePackage, revokedPackage])).toEqual([activePackage]);
    await expect(unwrapDocumentContentKeyForRecipient(revokedPackage, wrappingKey)).rejects.toThrow(
      'Recipient key package has been revoked'
    );
  });
});
