# Design System Specification: The Precision Studio

This design system is a high-utility, minimalist framework engineered for professional environments. It moves away from the "standard" web look by prioritizing depth through tonal layering rather than structural lines, and typographic authority over decorative elements. It is designed to feel like a high-end developer tool or a professional creative studio—fast, quiet, and intentional.

---

## 1. Creative North Star: "The Monolith"
The Creative North Star for this system is **The Monolith**. Much like a high-end camera body or a precision-milled piece of hardware, the UI should feel carved from a single block of material. 

We break the "template" look by using **intentional asymmetry** and **tonal nesting**. Instead of standard grids that box content in, we use negative space and subtle shifts in surface values to guide the eye. The interface does not "shout" for attention; it provides a sophisticated, low-distraction canvas for high-focus work.

---

## 2. Color & Surface Architecture

The palette is rooted in deep charcoals and blacks, utilizing the Material Design convention for semantic layering.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid, high-contrast borders to section off the UI. Separation must be achieved through background shifts. For example, a `surface-container-low` sidebar sitting against a `surface` editor. If a boundary is functionally required, use a "Ghost Border" (see Section 4).

### Surface Hierarchy & Nesting
Treat the UI as physical layers of matte material. Use the following hierarchy to define depth:
- **Base Layer:** `surface` (#0e0e0e) – The primary canvas.
- **Sunken Elements:** `surface-container-lowest` (#000000) – For code blocks, input fields, or "wells" where data is entered.
- **Raised Elements:** `surface-container-high` (#1f2020) – For floating panels, context menus, or active state overlays.

### The "Glass & Gradient" Rule
To add "soul" to the developer aesthetic:
- **Glassmorphism:** For floating modals or dropdowns, use `surface-variant` at 80% opacity with a `20px` backdrop-blur. This ensures the UI feels integrated into the environment rather than a "sticker" placed on top.
- **Signature Textures:** For primary actions, use a subtle linear gradient from `tertiary` (#679cff) to `tertiary_dim` (#0070eb) at a 145-degree angle. This adds a "machined" metallic quality to buttons.

---

## 3. Typography: The Hierarchical Engine

We use **Inter** exclusively. The brand identity is conveyed through weight and scale, not color shifts. We keep the "on-surface" color high-contrast for legibility but use "on-surface-variant" for metadata.

| Role | Token | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-md` | 2.75rem | 700 (Bold) | Hero impact, editorial headers. |
| **Headline** | `headline-sm` | 1.5rem | 600 (Semi-Bold) | Section starting points. |
| **Title** | `title-sm` | 1.0rem | 500 (Medium) | Component headers, card titles. |
| **Body** | `body-md` | 0.875rem | 400 (Regular) | Primary reading and data. |
| **Label** | `label-sm` | 0.6875rem | 600 (Semi-Bold) | Caps-lock metadata, utility tags. |

*Note: Use `0.2rem` (spacing-1) letter-spacing for `label-sm` to ensure readability in the dark theme.*

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are forbidden. We achieve "lift" through optical science.

- **The Layering Principle:** Place a `surface-container-low` (#131313) card on a `surface` (#0e0e0e) background. The delta is subtle but sufficient for the human eye to perceive a change in plane.
- **Ambient Shadows:** For floating elements (Modals/Popovers), use a shadow with a `32px` blur, `0px` offset, and `8%` opacity using the `on-surface` color. This mimics natural light diffusion in a dark room.
- **The Ghost Border Fallback:** If accessibility requirements demand a border, use the `outline-variant` (#484848) at **15% opacity**. This creates a "hairline" effect that is visible but not structural.

---

## 5. Components

### Buttons
- **Primary:** Gradient of `tertiary` to `tertiary_dim`. Text is `on-tertiary-fixed` (#ffffff). Radius: `lg` (0.5rem).
- **Secondary:** Surface is `secondary-container` (#3b3b3b). Text is `on-secondary-container`. No border.
- **Tertiary:** No background. Text is `primary`. On hover, use `surface-bright` (#2c2c2c) background at 50% opacity.

### Input Fields
- **Container:** `surface-container-lowest` (#000000).
- **Border:** Use the Ghost Border (15% `outline-variant`). On focus, the border opacity increases to 100% using the `tertiary` color.
- **Corner:** `md` (0.375rem).

### Cards & Lists
- **The "No-Divider" Rule:** Forbid 1px lines between list items. Instead, use `spacing-3` (0.6rem) of vertical white space or a hover state that changes the background to `surface-container-highest`.
- **Chips:** Small, low-profile badges using `surface-container-high` with `label-sm` typography. Radius: `full`.

### Precision Navigation (System Specific)
- **The "Command" Bar:** A floating `surface-container-highest` element with a `24px` backdrop-blur and a `0.5rem` radius. This is the "brain" of the utility.

---

## 6. Do’s and Don’ts

### Do
- **Use Nested Surfaces:** Always place darker containers inside lighter containers (or vice versa) to show nesting without lines.
- **Embrace Wide Margins:** Use `spacing-16` (3.5rem) for page gutters to create an editorial feel.
- **Vary Font Weights:** Use Semi-Bold (`600`) for labels and Bold (`700`) for headlines to create contrast where color is absent.

### Don't
- **Don't use Shadows for everything:** Only use shadows for elements that physically "float" (modals, tooltips).
- **Don't use #000000 for text:** Use `on-surface` (#e7e5e4) for maximum readability against dark backgrounds.
- **Don't use default "Blue":** Always use the specific `tertiary` (#679cff) for that sharp, professional studio glow.

---

## 7. Spacing Logic
Avoid arbitrary numbers. All layouts must follow the defined spacing scale.
- **Micro-interactions:** Use `spacing-1` to `spacing-2`.
- **Component Padding:** Use `spacing-4` (0.9rem).
- **Section Gaps:** Use `spacing-12` (2.75rem).