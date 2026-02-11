# NoteChain API Documentation

## Overview

The NoteChain API provides programmatic access to encrypted notes, AI features, and user management. All API endpoints are versioned and require authentication.

**Base URL:** `https://api.notechain.app/v1`

## Authentication

All API requests require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_api_token>
```

## Endpoints

### Notes

#### GET /notes

Retrieve a list of notes for the authenticated user.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20, max: 100) |
| tag | string | No | Filter by tag |
| search | string | No | Search query |

**Response:**

```json
{
  "data": [
    {
      "id": "note_123",
      "title": "My Encrypted Note",
      "encryptedContent": "base64encrypted...",
      "tags": ["work", "ideas"],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T14:20:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### POST /notes

Create a new note.

**Request Body:**

```json
{
  "title": "Note Title",
  "encryptedContent": "base64encrypted...",
  "tags": ["tag1", "tag2"],
  "encryptionVersion": "v1"
}
```

**Response:**

```json
{
  "id": "note_456",
  "title": "Note Title",
  "encryptedContent": "base64encrypted...",
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### GET /notes/:id

Retrieve a specific note.

**Response:**

```json
{
  "id": "note_123",
  "title": "My Encrypted Note",
  "encryptedContent": "base64encrypted...",
  "tags": ["work", "ideas"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:20:00Z",
  "version": 5
}
```

#### PUT /notes/:id

Update a note.

**Request Body:**

```json
{
  "title": "Updated Title",
  "encryptedContent": "base64encrypted...",
  "tags": ["work", "ideas", "updated"],
  "expectedVersion": 5
}
```

#### DELETE /notes/:id

Delete a note (soft delete).

**Response:**

```json
{
  "success": true,
  "message": "Note deleted successfully"
}
```

### AI Assistant

#### POST /ai/summarize

Generate a summary of encrypted note content.

**Request Body:**

```json
{
  "encryptedContent": "base64encrypted...",
  "decryptionKey": "keyForSecureEnclave",
  "maxLength": 200
}
```

**Response:**

```json
{
  "summary": "Key points from the note...",
  "confidence": 0.95
}
```

#### POST /ai/suggest-tags

Suggest tags for a note.

**Request Body:**

```json
{
  "encryptedContent": "base64encrypted...",
  "decryptionKey": "keyForSecureEnclave"
}
```

**Response:**

```json
{
  "suggestions": ["work", "meeting", "action-items"],
  "confidence": [0.92, 0.87, 0.75]
}
```

### Sync

#### GET /sync/changes

Retrieve changes since a given timestamp.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| since | string | Yes | ISO 8601 timestamp |
| deviceId | string | Yes | Device identifier |

**Response:**

```json
{
  "changes": [
    {
      "id": "note_123",
      "operation": "update",
      "timestamp": "2024-01-15T14:20:00Z",
      "checksum": "sha256..."
    }
  ],
  "serverTimestamp": "2024-01-15T14:25:00Z"
}
```

#### POST /sync/bulk

Upload bulk changes from client.

**Request Body:**

```json
{
  "changes": [
    {
      "id": "note_123",
      "operation": "create",
      "encryptedData": "base64encrypted...",
      "timestamp": "2024-01-15T14:20:00Z"
    }
  ],
  "deviceId": "device_abc123"
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "documentation": "https://docs.notechain.app/errors/ERROR_CODE"
  }
}
```

### Common Error Codes

| Code               | HTTP Status | Description                          |
| ------------------ | ----------- | ------------------------------------ |
| `VALIDATION_ERROR` | 400         | Invalid request data                 |
| `UNAUTHORIZED`     | 401         | Missing or invalid token             |
| `FORBIDDEN`        | 403         | Insufficient permissions             |
| `NOT_FOUND`        | 404         | Resource not found                   |
| `CONFLICT`         | 409         | Resource conflict (version mismatch) |
| `RATE_LIMITED`     | 429         | Too many requests                    |
| `INTERNAL_ERROR`   | 500         | Server error                         |

## Rate Limiting

- 100 requests/minute for free tier
- 1000 requests/minute for Pro tier
- Rate limit headers included in all responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Webhooks

Subscribe to real-time events:

**Endpoint:** `POST /webhooks/subscribe`

**Request Body:**

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["note.created", "note.updated", "note.deleted"],
  "secret": "your_webhook_secret"
}
```

## SDKs

- [JavaScript/TypeScript](https://github.com/notechain/sdk-js)
- [Python](https://github.com/notechain/sdk-python)

## Support

- [API Status](https://status.notechain.app)
- [Developer Portal](https://developers.notechain.app)
- Email: api@notechain.app
