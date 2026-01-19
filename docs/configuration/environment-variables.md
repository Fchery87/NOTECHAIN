# Environment Variables Configuration

This document provides a comprehensive reference for all environment variables used across the NoteChain application stack.

## Overview

NoteChain uses environment variables for configuration across four main components:

- **Mobile App** (React Native)
- **Web App** (Next.js)
- **Desktop App** (Tauri)
- **Supabase** (Backend Services)

All sensitive values should never be committed to version control. Copy `.env.example` to `.env` and fill in your actual values.

---

## Mobile App (`apps/mobile/.env.example`)

| Variable                    | Required | Default     | Description                              |
| --------------------------- | -------- | ----------- | ---------------------------------------- |
| `SUPABASE_URL`              | Yes      | -           | Supabase project URL                     |
| `SUPABASE_ANON_KEY`         | Yes      | -           | Supabase anonymous key (public)          |
| `SUPABASE_PROJECT_ID`       | Yes      | -           | Supabase project identifier              |
| `ENCRYPTION_ALGORITHM`      | No       | AES-256-GCM | Encryption algorithm for note encryption |
| `KEY_DERIVATION_ITERATIONS` | No       | 310000      | PBKDF2 iterations for key derivation     |
| `NONCE_LENGTH`              | No       | 12          | Length of encryption nonce (bytes)       |
| `AUTH_TAG_LENGTH`           | No       | 16          | Authentication tag length (bytes)        |
| `BIOMETRIC_UNLOCK_ENABLED`  | No       | true        | Enable biometric authentication          |
| `BIOMETRIC_RETRY_COUNT`     | No       | 3           | Max biometric authentication retries     |
| `SYNC_QUEUE_MAX_SIZE`       | No       | 1000        | Maximum sync queue size                  |
| `SYNC_RETRY_DELAY_MS`       | No       | 5000        | Sync retry delay in milliseconds         |
| `SYNC_MAX_RETRIES`          | No       | 5           | Maximum sync retry attempts              |
| `ANALYTICS_ENABLED`         | No       | false       | Enable privacy-preserving analytics      |
| `ANALYTICS_ENDPOINT`        | No       | -           | Analytics endpoint URL                   |
| `DEBUG_MODE`                | No       | false       | Enable debug logging                     |
| `LOG_LEVEL`                 | No       | warn        | Logging level (debug, info, warn, error) |

---

## Web App (`apps/web/.env.example`)

### Supabase Configuration

| Variable                        | Required | Default | Description                     |
| ------------------------------- | -------- | ------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | -       | Supabase project URL (public)   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | -       | Supabase anonymous key (public) |

### PWA Configuration

| Variable                      | Required | Default    | Description      |
| ----------------------------- | -------- | ---------- | ---------------- |
| `NEXT_PUBLIC_PWA_NAME`        | No       | NoteChain  | PWA display name |
| `NEXT_PUBLIC_PWA_SHORT_NAME`  | No       | NoteChain  | PWA short name   |
| `NEXT_PUBLIC_PWA_THEME_COLOR` | No       | #1a1a1a    | PWA theme color  |
| `NEXT_PUBLIC_PWA_ICON`        | No       | ./icon.png | PWA icon path    |

### Service Worker

| Variable                         | Required | Default | Description                         |
| -------------------------------- | -------- | ------- | ----------------------------------- |
| `NEXT_PUBLIC_SW_UPDATE_INTERVAL` | No       | 3600000 | Service worker update interval (ms) |

### Web Push Notifications

| Variable            | Required | Default | Description                              |
| ------------------- | -------- | ------- | ---------------------------------------- |
| `VAPID_PUBLIC_KEY`  | No       | -       | VAPID public key for push notifications  |
| `VAPID_PRIVATE_KEY` | No       | -       | VAPID private key for push notifications |
| `VAPID_SUBJECT`     | No       | -       | VAPID subject (mailto: or URL)           |

### Mobile Variables (Inherited)

The web app also inherits all mobile app variables for shared functionality.

---

## Desktop App (`apps/desktop/.env.example`)

### Supabase Configuration

| Variable                 | Required | Default | Description                     |
| ------------------------ | -------- | ------- | ------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | -       | Supabase project URL (public)   |
| `VITE_SUPABASE_ANON_KEY` | Yes      | -       | Supabase anonymous key (public) |

### Desktop Configuration

| Variable           | Required | Default   | Description         |
| ------------------ | -------- | --------- | ------------------- |
| `VITE_APP_NAME`    | No       | NoteChain | Application name    |
| `VITE_APP_VERSION` | No       | 0.1.0     | Application version |

### Auto-Update

| Variable          | Required | Default | Description                        |
| ----------------- | -------- | ------- | ---------------------------------- |
| `UPDATER_ENABLED` | No       | true    | Enable automatic updates           |
| `UPDATER_CHANNEL` | No       | stable  | Update channel (stable, beta, dev) |

### Window Configuration

| Variable        | Required | Default | Description                    |
| --------------- | -------- | ------- | ------------------------------ |
| `WINDOW_WIDTH`  | No       | 1200    | Default window width (pixels)  |
| `WINDOW_HEIGHT` | No       | 800     | Default window height (pixels) |

---

## Supabase (`supabase/.env.example`)

### Database Configuration

| Variable       | Required | Default | Description                  |
| -------------- | -------- | ------- | ---------------------------- |
| `DATABASE_URL` | Yes      | -       | PostgreSQL connection string |

### JWT Configuration

| Variable                  | Required | Default | Description                            |
| ------------------------- | -------- | ------- | -------------------------------------- |
| `JWT_SECRET`              | Yes      | -       | JWT signing secret (min 32 characters) |
| `JWT_EXPIRY_HOURS`        | No       | 24      | JWT token expiry time (hours)          |
| `JWT_REFRESH_EXPIRY_DAYS` | No       | 7       | JWT refresh token expiry (days)        |

### Supabase Keys

| Variable               | Required | Default | Description                        |
| ---------------------- | -------- | ------- | ---------------------------------- |
| `SUPABASE_ANON_KEY`    | Yes      | -       | Supabase anonymous key             |
| `SUPABASE_SERVICE_KEY` | Yes      | -       | Supabase service role key (secret) |

### Storage Configuration (S3-Compatible)

| Variable             | Required | Default   | Description                    |
| -------------------- | -------- | --------- | ------------------------------ |
| `STORAGE_ENDPOINT`   | No       | -         | S3-compatible storage endpoint |
| `STORAGE_BUCKET`     | No       | -         | Storage bucket name            |
| `STORAGE_ACCESS_KEY` | No       | -         | Storage access key             |
| `STORAGE_SECRET_KEY` | No       | -         | Storage secret key             |
| `STORAGE_REGION`     | No       | us-east-1 | Storage region                 |

### Email Configuration

| Variable    | Required | Default | Description                  |
| ----------- | -------- | ------- | ---------------------------- |
| `SMTP_HOST` | No       | -       | SMTP server host             |
| `SMTP_PORT` | No       | 587     | SMTP server port             |
| `SMTP_USER` | No       | -       | SMTP authentication username |
| `SMTP_PASS` | No       | -       | SMTP authentication password |
| `SMTP_FROM` | No       | -       | From email address           |

### Security Configuration

| Variable                         | Required | Default | Description                  |
| -------------------------------- | -------- | ------- | ---------------------------- |
| `RATE_LIMIT_ENABLED`             | No       | true    | Enable rate limiting         |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | No       | 100     | Requests per minute limit    |
| `ALLOW_PLAINTEXT`                | No       | false   | Allow plaintext note storage |

### Logging Configuration

| Variable     | Required | Default | Description              |
| ------------ | -------- | ------- | ------------------------ |
| `LOG_LEVEL`  | No       | warn    | Logging level            |
| `LOG_FORMAT` | No       | json    | Log format (json, plain) |

---

## Security Considerations

### Sensitive Variables (Never Commit)

- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `VAPID_PRIVATE_KEY`
- `SMTP_PASS`
- `STORAGE_SECRET_KEY`
- `STORAGE_ACCESS_KEY`

### Public Variables (Safe to Expose)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_PWA_*`

### Best Practices

1. **Use strong secrets**: JWT_SECRET must be at least 32 characters
2. **Rotate credentials**: Regularly rotate API keys and secrets
3. **Use different values per environment**: Development, staging, and production should each have unique credentials
4. **Enable encryption**: Never set `ALLOW_PLAINTEXT=true` in production
5. **Limit rate limiting**: Adjust `RATE_LIMIT_REQUESTS_PER_MINUTE` based on expected traffic

---

## Development vs Production

### Development

```bash
# Use local Supabase for development
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
STORAGE_ENDPOINT=http://localhost:9000

# Enable debug features
DEBUG_MODE=true
LOG_LEVEL=debug
```

### Production

```bash
# Use production Supabase
DATABASE_URL=postgresql://user:pass@db.example.com:5432/prod
STORAGE_ENDPOINT=https://s3.amazonaws.com

# Disable debug features
DEBUG_MODE=false
LOG_LEVEL=error

# Enable security features
ALLOW_PLAINTEXT=false
RATE_LIMIT_ENABLED=true
```

---

## Setup Instructions

1. Copy `.env.example` to `.env` in each application's root directory
2. Fill in all required values
3. Never commit `.env` files to version control
4. Use a secrets manager for production deployments
