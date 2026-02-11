---
name: notechain-guidelines
description: NoteChain development guidelines combining Karpathy's coding principles with the project's Warm Editorial Minimalism aesthetic.
license: MIT
---

# NoteChain Development Guidelines

> _Your thoughts. Encrypted. Yours alone._

Behavioral guidelines for building NoteChain, combining [Andrej Karpathy's coding principles](https://x.com/karpathy/status/2015883857489522876) with our **Warm Editorial Minimalism** design philosophy.

---

## Design System: Warm Editorial Minimalism

### Visual Identity

NoteChain embodies a calm, focused, and trustworthy aesthetic — like a premium notebook meets modern encryption.

**Core Philosophy:**

- **Warmth over coldness** — Stone and amber tones, not sterile grays
- **Editorial elegance** — Serif headlines, generous whitespace, refined typography
- **Minimalist restraint** — Only what's necessary, beautifully executed
- **Privacy-first presence** — Security indicators that reassure without alarming

### Color Palette

```
Primary Backgrounds:
  --color-bg-primary:   #fafaf9  (Warm white)
  --color-bg-secondary: #f5f5f4  (Soft stone)
  --color-bg-dark:      #1c1917  (Deep stone)

Text Hierarchy:
  --color-text-primary:   #1c1917  (Near black)
  --color-text-secondary: #57534e  (Warm gray)
  --color-text-muted:     #a8a29e  (Subtle gray)

Accent Palette:
  --color-accent-warm: #f59e0b  (Amber — primary actions)
  --color-accent-rose: #f43f5e  (Rose — encryption, security)

Supporting Stones:
  stone-50  → stone-900  (Full warm gray spectrum)
  amber-50  → amber-900  (Warm action spectrum)
  rose-50   → rose-900   (Security/emphasis spectrum)
```

### Typography

```
Headlines:  "Newsreader", Georgia, serif
  - Weight: 500
  - Tracking: -0.02em
  - Style: Elegant, editorial, trustworthy

Body:       "DM Sans", system-ui, sans-serif
  - Clean, modern, highly readable
  - Use for UI, paragraphs, labels

Monospace:  "JetBrains Mono", "Fira Code", monospace
  - Encryption keys, code snippets, technical data
```

### Visual Effects

**Gradient Accents:**

```css
.text-gradient-warm {
  background: linear-gradient(135deg, #d97706, #f43f5e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Glass Morphism:**

```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

**Subtle Noise:**

- 3% opacity noise overlay for texture
- Applied to hero sections for depth

### Animation Language

- **fadeIn**: 0.6s ease-out — Content reveals
- **slideInLeft/Right**: 0.6s ease-out — Section transitions
- **float**: 3s ease-in-out infinite — Gentle emphasis
- **pulse-soft**: 2s ease-in-out infinite — Live indicators

All animations should feel _calm_, never jarring.

---

## Code Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## UI Implementation Standards

### Component Structure

```tsx
// Use semantic class ordering
<div className="
  /* Layout */
  flex items-center justify-between
  /* Spacing */
  px-6 py-4
  /* Visual */
  bg-stone-50 rounded-xl border border-stone-200
  /* Typography */
  text-stone-700 font-medium
  /* Interactive */
  hover:bg-stone-100 transition-colors duration-300
  /* State */
  disabled:opacity-50 disabled:cursor-not-allowed
">
```

### Button Hierarchy

```tsx
// Primary — Dark stone, high emphasis
<button className="
  px-5 py-2.5
  bg-stone-900 text-stone-50
  font-medium rounded-lg
  hover:bg-stone-800
  transition-all duration-300
  hover:shadow-lg hover:shadow-stone-900/20
">

// Secondary — Light background, medium emphasis
<button className="
  px-5 py-2.5
  bg-stone-100 text-stone-800
  font-medium rounded-lg
  hover:bg-stone-200
  transition-all duration-300
">

// Tertiary — Text only, low emphasis
<button className="
  text-stone-600
  font-medium
  hover:text-stone-900
  transition-colors
">
```

### Security Indicators

```tsx
// Encryption status — subtle, reassuring
<div className="flex items-center gap-2 text-xs text-stone-500">
  <svg className="w-4 h-4" /* lock icon */ />
  <span>End-to-end encrypted</span>
  <span className="text-amber-600 font-medium">AES-256-GCM</span>
</div>

// Live sync indicator — gentle pulse
<div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
  <span className="text-xs font-medium text-green-700">Synced</span>
</div>
```

### Form Elements

```tsx
// Input fields — clean, focused
<input className="
  w-full px-4 py-3
  bg-white border border-stone-200 rounded-lg
  text-stone-900 placeholder:text-stone-400
  focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
  transition-all duration-200
">
```

---

## Project Structure

```
apps/web/
├── src/app/
│   ├── components/     # Page sections (Hero, Features, etc.)
│   ├── globals.css     # Design system tokens
│   ├── layout.tsx      # Root layout with fonts
│   └── page.tsx        # Landing page
├── postcss.config.mjs  # Tailwind v4 processing
└── next.config.ts      # Next.js configuration

packages/
├── core-crypto/        # Encryption services
├── data-models/        # Database schemas
├── sync-engine/        # CRDT & sync logic
└── ui-components/      # Shared React components
```

---

## Quick Reference

| Element         | Class Pattern                                                |
| --------------- | ------------------------------------------------------------ |
| Page background | `bg-stone-50` or `bg-[#fafaf9]`                              |
| Card/container  | `bg-white rounded-2xl shadow-lg border border-stone-100`     |
| Headline        | `font-serif text-5xl md:text-6xl font-medium text-stone-900` |
| Body text       | `text-stone-600 leading-relaxed`                             |
| Muted text      | `text-stone-400 text-sm`                                     |
| Primary button  | `bg-stone-900 text-stone-50 hover:bg-stone-800`              |
| Accent gradient | `text-gradient-warm`                                         |
| Glass effect    | `glass` utility class                                        |
| Section padding | `py-20 md:py-32`                                             |
| Container       | `max-w-7xl mx-auto px-6 lg:px-8`                             |
