# Design System - Cosmic Flow

Dark space theme with blue/green accents.

---

## Color Palette

### Base Colors

| Name | Hex | Use |
| ---- | --- | --- |
| Void | `#0a0e17` | Deep background |
| Nebula | `#111827` | Card backgrounds |
| Stardust | `#1f2937` | Borders, dividers |

### Accent Colors

| Name | Hex | Use |
| ---- | --- | --- |
| Aurora | `#10b981` | Primary (emerald) |
| Pulsar | `#06b6d4` | Secondary (cyan) |
| Cosmic | `#8b5cf6` | Highlights (violet) |

### Text Colors

| Name | Opacity | Use |
| ---- | ------- | --- |
| Star White | 100% | Headings |
| Moon Glow | 70% | Body text |
| Dim Star | 40% | Muted text |

---

## CSS Variables

```css
:root {
  /* Base */
  --color-void: #0a0e17;
  --color-nebula: #111827;
  --color-stardust: #1f2937;
  
  /* Accents */
  --color-aurora: #10b981;
  --color-pulsar: #06b6d4;
  --color-cosmic: #8b5cf6;
  
  /* Glass */
  --glass-bg: rgba(17, 24, 39, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
}
```

---

## Components

### Cards

- Glass effect with backdrop blur
- Subtle border glow on hover
- Smooth transitions

### Buttons

- Primary: Aurora gradient
- Secondary: Ghost with border
- Hover: Scale + glow

### Typography

- Headings: Bold, gradient text
- Body: Regular, moon-glow opacity
