# NoteChain Marketing Website

The public-facing marketing website for NoteChain, built with Next.js 15 and Tailwind CSS.

## Overview

This Next.js application serves as the marketing site, featuring:

- Landing page with product overview
- Pricing page with tier comparisons
- FAQ page
- Waitlist signup form
- Responsive design optimized for all devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4.0
- **Language**: TypeScript
- **Shared Components**: @notechain/ui-components

## Development

### Running Locally

```bash
# From monorepo root
bun run dev:marketing

# Or from this directory
bun run dev
```

The site will be available at http://localhost:3001

### Building

```bash
# From monorepo root
bun run build:apps

# Or from this directory
bun run build
```

### Linting

```bash
bun run lint
```

### Type Checking

```bash
bun run typecheck
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page (/)
│   ├── pricing/           # Pricing page (/pricing)
│   ├── faq/               # FAQ page (/faq)
│   ├── waitlist/          # Waitlist signup (/waitlist)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Hero.tsx          # Hero section
│   ├── Features.tsx      # Features showcase
│   ├── Pricing.tsx       # Pricing cards
│   ├── PricingCard.tsx   # Individual pricing tier
│   ├── WaitlistForm.tsx  # Email signup form
│   ├── Navigation.tsx    # Site navigation
│   └── Footer.tsx        # Site footer
└── lib/                  # Utilities (if needed)
```

## Pages

### Landing Page (`/`)

The main marketing page featuring:

- Hero section with CTA
- Feature highlights
- Social proof
- Call to action

**Components used**:

- `Hero` - Main hero section
- `Features` - Feature showcase grid
- Navigation & Footer

### Pricing Page (`/pricing`)

Displays pricing tiers with feature comparisons.

**Tiers**:

- Free - Basic features
- Pro - Advanced features ($9/month)
- Premium - All features ($19/month)

**Components used**:

- `Pricing` - Pricing section wrapper
- `PricingCard` - Individual tier card

### FAQ Page (`/faq`)

Frequently asked questions organized by category:

- General
- Features
- Security & Privacy
- Pricing & Billing
- Technical

### Waitlist Page (`/waitlist`)

Beta signup form for early access.

**Components used**:

- `WaitlistForm` - Email collection form

## Components

### Hero

The main hero section of the landing page.

**Props**: None

**Features**:

- Large heading
- Subheading
- Primary CTA button
- Optional background image/gradient

### Features

Grid display of product features.

**Props**: None

**Features**:

- Icon + title + description cards
- Responsive grid layout
- Hover effects

### Pricing

Container for pricing tiers.

**Props**:

- `tiers`: Array of pricing tier objects

### PricingCard

Individual pricing tier card.

**Props**:

```typescript
interface PricingCardProps {
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  cta: string;
  highlighted?: boolean;
}
```

### WaitlistForm

Email capture form for beta signups.

**Props**:

```typescript
interface WaitlistFormProps {
  onSubmit?: (email: string) => void;
}
```

**Features**:

- Email validation
- Loading state
- Success/error messages
- GDPR-compliant opt-in

### Navigation

Site navigation bar.

**Props**: None

**Features**:

- Logo
- Navigation links
- Mobile menu (hamburger)
- CTA button

### Footer

Site footer with links and legal info.

**Props**: None

**Sections**:

- Product links
- Company links
- Legal links (Privacy, Terms)
- Social media icons

## Styling

Uses Tailwind CSS with custom configuration.

### Theme

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {...},
      secondary: {...},
    },
    fontFamily: {
      sans: ['Inter', ...],
    },
  },
}
```

### Responsive Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Forms & Data Handling

### Waitlist Signup

Currently uses a simple form. To integrate with a backend:

```typescript
// src/app/waitlist/page.tsx
async function handleSubmit(email: string) {
  const response = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) throw new Error('Failed to submit');
}
```

### Recommended Integrations

- **Mailchimp** - Email marketing
- **ConvertKit** - Creator-focused email
- **SendGrid** - Transactional emails
- **Vercel Forms** - Simple form handling

## SEO & Meta Tags

Each page includes proper meta tags:

```typescript
// src/app/page.tsx
export const metadata: Metadata = {
  title: 'NoteChain - Privacy-First Note Taking',
  description: 'End-to-end encrypted note taking with AI-powered features',
  openGraph: {
    title: 'NoteChain',
    description: '...',
    images: ['/og-image.png'],
  },
};
```

## Analytics (Optional)

To add analytics:

```bash
# Vercel Analytics
bun add @vercel/analytics

# Google Analytics
bun add @next/third-parties
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## Deployment

### Vercel (Recommended)

```bash
# Deploy
vercel --prod

# Custom domain
vercel domains add yourdomain.com
```

### Custom Server

```bash
# Build
bun run build

# Start production server
bun run start
```

## Environment Variables

Create `.env.local` from `.env.example`:

```env
NODE_ENV=development

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Optional: Form endpoints
NEXT_PUBLIC_WAITLIST_API_ENDPOINT=https://api.example.com/waitlist
```

## Testing

Currently no tests. To add:

```bash
bun add -d @testing-library/react @testing-library/jest-dom
```

```typescript
// src/components/__tests__/Hero.test.tsx
import { render, screen } from '@testing-library/react';
import { Hero } from '../Hero';

test('renders hero heading', () => {
  render(<Hero />);
  expect(screen.getByRole('heading')).toBeInTheDocument();
});
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Performance

- Lighthouse Score: 95+
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3.5s

### Optimization Tips

- Use Next.js Image component
- Implement lazy loading
- Minimize bundle size
- Enable compression
- Use CDN for assets

## Future Enhancements

- [ ] Add blog section
- [ ] Implement A/B testing
- [ ] Add live chat widget
- [ ] Create customer testimonials section
- [ ] Add product demo video
- [ ] Implement multi-language support

## License

Proprietary - See [LICENSE](../../LICENSE)
