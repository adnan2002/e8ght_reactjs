# E8GHT Design System

This document defines the visual design system for the E8GHT platform. All UI components should follow these guidelines to maintain brand consistency.

---

## Brand Identity

The E8GHT brand uses a **Pink, White, and Black** color palette inspired by the logo. The design language is modern, clean, and approachable with soft gradients and rounded corners.

---

## Color Palette

### Primary Colors (Pink)

| Name | Hex | Usage |
|------|-----|-------|
| Pink 50 | `#fdf2f8` | Light backgrounds, hover states |
| Pink 100 | `#fce7f3` | Subtle backgrounds, cards |
| Pink 200 | `#fbcfe8` | Borders, dividers |
| Pink 400 | `#f472b6` | Secondary accents |
| Pink 500 | `#ec4899` | Primary brand color, buttons, links |
| Pink 600 | `#db2777` | Darker accents, gradients |
| Pink 700 | `#be185d` | Dark hover states |

### Neutral Colors

| Name | Hex | Usage |
|------|-----|-------|
| White | `#ffffff` | Backgrounds, cards, text on dark |
| Gray 50 | `#f9fafb` | Page backgrounds |
| Gray 100 | `#f3f4f6` | Subtle backgrounds |
| Gray 400 | `#9ca3af` | Muted text, placeholders |
| Gray 500 | `#6b7280` | Secondary text |
| Gray 600 | `#4b5563` | Body text |
| Gray 800 | `#1f2937` | Headings, primary text |
| Gray 900 | `#111827` | Darkest text |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#10b981` | Success states, confirmations |
| Success Light | `#d1fae5` | Success backgrounds |
| Error | `#dc2626` | Error states, destructive actions |
| Error Light | `#fee2e2` | Error backgrounds |
| Warning | `#f59e0b` | Warning states |
| Warning Light | `#fef3c7` | Warning backgrounds |
| Info | `#3b82f6` | Informational states |
| Info Light | `#dbeafe` | Info backgrounds |

---

## Gradients

### Primary Gradient (Pink)
```css
background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
```
Used for: Primary buttons, avatars, accent elements

### Light Background Gradient
```css
background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
```
Used for: Header, subtle section backgrounds

### Hero Gradient
```css
background: linear-gradient(165deg, #fdf2f8 0%, #fce7f3 25%, #fbcfe8 50%, #f9a8d4 100%);
```
Used for: Landing page hero section

### Dark CTA Gradient
```css
background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
```
Used for: Dark sections, CTA blocks

---

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| Display | `clamp(2rem, 5vw, 3.25rem)` | 800 | Hero headlines |
| H1 | `clamp(1.75rem, 4vw, 2.5rem)` | 800 | Page titles |
| H2 | `1.5rem` | 700 | Section headings |
| H3 | `1.2rem` | 700 | Card titles |
| Body | `1rem` | 400 | Body text |
| Small | `0.9rem` | 400-500 | Secondary text |
| Caption | `0.75rem` | 500-600 | Labels, badges |

### Letter Spacing
- Headlines: `-0.02em`
- Labels/Uppercase: `0.1em`

---

## Spacing

Use a consistent spacing scale:

| Name | Value |
|------|-------|
| xs | `0.25rem` (4px) |
| sm | `0.5rem` (8px) |
| md | `0.75rem` (12px) |
| lg | `1rem` (16px) |
| xl | `1.5rem` (24px) |
| 2xl | `2rem` (32px) |
| 3xl | `3rem` (48px) |
| 4xl | `4rem` (64px) |

---

## Border Radius

| Name | Value | Usage |
|------|-------|-------|
| sm | `6px` | Small buttons, tags |
| md | `8px` | Inputs, small cards |
| lg | `10-12px` | Buttons, toggles |
| xl | `14-16px` | Cards, dropdowns |
| 2xl | `20px` | Large cards, modals |
| full | `999px` | Avatars, pills, badges |

---

## Shadows

### Subtle Shadow
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
```
Used for: Buttons, toggles

### Card Shadow
```css
box-shadow: 0 8px 20px rgba(236, 72, 153, 0.08);
```
Used for: Cards, accordion items

### Elevated Shadow
```css
box-shadow: 0 16px 40px rgba(236, 72, 153, 0.15);
```
Used for: Modals, dropdowns, popovers

### Button Shadow (Pink)
```css
box-shadow: 0 4px 14px rgba(236, 72, 153, 0.35);
```
Used for: Primary buttons

### Button Shadow Hover (Pink)
```css
box-shadow: 0 6px 20px rgba(236, 72, 153, 0.45);
```
Used for: Primary button hover state

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.35);
  transition: all 200ms ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.45);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  color: #1f2937;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(236, 72, 153, 0.2);
  font-weight: 600;
  transition: all 200ms ease;
}

.btn-secondary:hover {
  border-color: #ec4899;
  color: #ec4899;
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: #4b5563;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-weight: 600;
  transition: all 200ms ease;
}

.btn-ghost:hover {
  background: #fdf2f8;
  border-color: #ec4899;
  color: #ec4899;
}
```

### Cards

```css
.card {
  background: white;
  border: 1px solid rgba(236, 72, 153, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(236, 72, 153, 0.08);
  transition: all 300ms ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.2);
}
```

### Inputs

```css
.input {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: white;
  font-size: 1rem;
  transition: all 200ms ease;
}

.input:focus {
  outline: none;
  border-color: #ec4899;
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
}
```

### Avatars

```css
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  color: white;
  font-weight: 700;
}

/* Sizes */
.avatar-sm { width: 2rem; height: 2rem; font-size: 0.85rem; }
.avatar-md { width: 2.75rem; height: 2.75rem; font-size: 1rem; }
.avatar-lg { width: 3.5rem; height: 3.5rem; font-size: 1.25rem; }
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-pink {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.badge-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
```

---

## Animations

### Transitions
- Default: `200ms ease`
- Cards/Hover: `300ms ease`
- Sidebar: `320ms cubic-bezier(0.4, 0, 0.2, 1)`

### Hover Transform
```css
transform: translateY(-2px);  /* Buttons */
transform: translateY(-4px);  /* Cards */
transform: scale(1.02);       /* Brand logo */
transform: scale(1.05);       /* Icon buttons */
```

### Fade In Animation
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Accessibility

- Ensure color contrast ratio of at least 4.5:1 for text
- Use `focus-visible` states for keyboard navigation
- Focus ring: `box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.25);`
- Never rely solely on color to convey information

---

## Usage Notes

1. **Consistency**: Always use colors from this palette, avoid custom hex values
2. **Gradients**: Use sparingly for emphasis (buttons, avatars, accent bars)
3. **White Space**: Generous padding creates a premium feel
4. **Hover States**: All interactive elements should have clear hover feedback
5. **Pink Accent**: Use pink for primary actions, links, and focus states
6. **Dark Text**: Use gray-800 (`#1f2937`) for headings, gray-600 (`#4b5563`) for body text

