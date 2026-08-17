---
name: Aetheris AI
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#464554'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#4d4ad5'
  primary: '#4441cc'
  on-primary: '#ffffff'
  primary-container: '#5e5ce6'
  on-primary-container: '#f4f1ff'
  inverse-primary: '#c2c1ff'
  secondary: '#9026c3'
  on-secondary: '#ffffff'
  secondary-container: '#cb66fe'
  on-secondary-container: '#4a006b'
  tertiary: '#0055a9'
  on-tertiary: '#ffffff'
  tertiary-container: '#006dd6'
  on-tertiary-container: '#f0f3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c2c1ff'
  on-primary-fixed: '#0c006b'
  on-primary-fixed-variant: '#332dbc'
  secondary-fixed: '#f6d9ff'
  secondary-fixed-dim: '#e9b3ff'
  on-secondary-fixed: '#310048'
  on-secondary-fixed-variant: '#7200a3'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#aac7ff'
  on-tertiary-fixed: '#001b3e'
  on-tertiary-fixed-variant: '#00468d'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-xl:
    fontFamily: Geist
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 32px
  margin-desktop: 80px
  margin-mobile: 24px
---

## Brand & Style
The design system embodies the intersection of high-level academia and next-generation artificial intelligence. It is a premium, futuristic aesthetic that prioritizes clarity while maintaining a sense of wonder. 

The style is primarily **Glassmorphism**, defined by high-transparency layers and vibrant aurora-inspired lighting. The interface should feel light, airy, and "unbound" by traditional container boundaries. Visual complexity is achieved through light refraction and depth rather than heavy ornamentation. The emotional goal is to evoke feelings of discovery, precision, and elite technological capability.

## Colors
The palette is rooted in a pure white base to ensure academic legibility, overlaid with vibrant, multi-chromatic accents. 

- **Primary & Secondary:** A blend of electric blue and royal purple used for interactive states and brand-critical elements.
- **Aurora Accents:** Cyan and emerald are reserved for data visualizations and specific "neural flow" indicators.
- **Glass Base:** Surfaces are 70% opacity white with a high backdrop-blur (minimum 20px) to maintain the "frosted glass" effect.
- **Verified Status:** Subtle metallic gold is used exclusively for badges, certifications, and high-trust labels to distinguish them from the cooler primary palette.

## Typography
The system utilizes **Geist** for its technical precision and modern geometry. 

- **Display & Headings:** Use tight letter spacing for a dense, flagship feel. In certain editorial contexts, apply a subtle gradient mask to text using the "Aurora" palette.
- **Body Text:** Generous line heights are required to ensure readability against glass surfaces.
- **Labels:** Small labels use increased tracking (letter spacing) and uppercase styling to denote metadata or "Verified" status tags.

## Layout & Spacing
The layout relies on a **Fluid Grid** with extremely generous whitespace to mimic the "limitless" nature of AI. 

- **Safe Margins:** Use large horizontal margins on desktop (80px+) to center-focus content and create a boutique, premium feel.
- **Rhythm:** An 8px base unit is used for all internal component spacing.
- **Reflow:** On mobile, margins tighten to 24px, and glass cards stack vertically. Fixed components like the neural navigation bar should transition to a bottom-docked translucent bar on smaller screens.

## Elevation & Depth
Depth is created through **Glassmorphism** and **Aurora Lighting** rather than traditional black shadows.

1.  **Surfaces:** All containers utilize `backdrop-filter: blur(24px)` and a 1px semi-transparent white border to define edges.
2.  **Aurora Glows:** High-priority cards feature an "under-glow"—a soft, diffused drop shadow tinted with the primary blue/purple colors at very low (10-15%) opacity.
3.  **Floating Elements:** Elements at the highest elevation use "Animated Gradient Borders"—a slow-moving aura gradient that rotates around the 1px stroke of the card.

## Shapes
The design system uses a **Rounded** (Level 2) language. This balances the "friendly" approachable nature of AI with the structured "rigor" of research.

- **Standard Cards:** 1rem (16px) corner radius.
- **Inputs & Buttons:** 0.5rem (8px) corner radius for a more technical appearance.
- **Neural Nodes:** Interactive graph elements should be perfect circles to represent data points.

## Components
- **Buttons:** Primary buttons use a solid-to-gradient hover state. Secondary buttons are "Ghost" style with a 1px gradient border and no fill until interaction.
- **Translucent Cards:** The signature component. They must include a `1px` white border at 30% opacity and a backdrop blur. For AI-generated content, the card features a faint, animated "neural pattern" background.
- **Input Fields:** Minimalist design with only a bottom border that expands into a full gradient glow when focused.
- **Chips/Status:** "Verified" status chips use the accent gold with a subtle shimmer effect. All other chips use low-contrast neutral glass fills.
- **Floating Action Bar:** A center-aligned, pill-shaped navigation element that floats at the bottom of the viewport, using maximum backdrop blur.
- **Neural Progress Bars:** Instead of solid fills, progress indicators use a moving gradient "aurora" to show computation.