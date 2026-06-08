# Electric Dark - Design Brainstorm

## Approach 1: Cyberpunk Minimalism (Probability: 0.08)

**Design Movement:** Cyberpunk aesthetic meets Japanese minimalism—think Blade Runner meets zen simplicity.

**Core Principles:**
- Extreme contrast: Pure black (#000000) vs. neon lime (#C0F11C) with zero middle ground
- Geometric precision: Clean lines, sharp angles, no rounded corners except for critical interactive elements
- Information density: Every pixel serves a purpose; whitespace is intentional and structural
- Futuristic utilitarianism: Form follows function with a sci-fi edge

**Color Philosophy:**
- Black background creates a canvas for neon lime to "float" and command attention
- Lime green (#C0F11C) represents digital vitality and Nigerian energy
- Subtle grays (5-10% opacity white) for secondary information, never competing with lime
- No gradients—solid colors only for maximum clarity

**Layout Paradigm:**
- Vertical stack with left-aligned content; right side reserved for live map integration
- Tab navigation as a horizontal accent bar with lime underline indicator
- Cards as floating elements with subtle 1px lime borders instead of shadows
- Grid-based but asymmetric: 2-column on desktop, full-width on mobile

**Signature Elements:**
- Glowing lime accent lines (1-2px) that frame key sections
- Neon lime crosshair icon for GPS location picker
- Animated lime pulse on active tabs and loading states
- Monospace font for pricing (₦ symbol in lime)

**Interaction Philosophy:**
- Instant feedback: All clicks trigger immediate visual confirmation
- Hover states: Lime glow expands slightly on hover (no color change, just glow intensity)
- Transitions: 150ms ease-out for all state changes
- No animations on load—only on user interaction

**Animation:**
- Button press: Scale 0.98 with 120ms ease-out
- Tab switch: Lime underline slides horizontally (200ms)
- Fare card entry: Slide up from bottom with 180ms ease-out, stagger by 40ms
- Map route draw: Lime line animates along path at 2s duration

**Typography System:**
- Display: IBM Plex Mono Bold (monospace for premium tech feel)
- Body: Inter Regular (clean, readable)
- Hierarchy: 32px / 24px / 16px / 14px
- All-caps for section headers to reinforce geometric aesthetic

---

## Approach 2: Dark Luxury Transit (Probability: 0.07)

**Design Movement:** Premium fintech UI meets luxury automotive design—think Tesla interface meets high-end banking app.

**Core Principles:**
- Sophisticated restraint: Lime is accent only, not dominant
- Depth through layers: Multiple shades of dark gray create visual hierarchy
- Premium spacing: Generous padding and breathing room throughout
- Tactile feedback: Subtle shadows and depth cues make UI feel "real"

**Color Philosophy:**
- Pure black background (#000000) as foundation
- Neon lime (#C0F11C) for primary CTAs, active states, and critical alerts only
- Dark grays (15-25% opacity white) for secondary elements and borders
- Warm accent gray (#2A2A2A) for card backgrounds to add dimension

**Layout Paradigm:**
- Centered hero section with map taking 60% of viewport
- Floating card panels overlay the map with semi-transparent backdrops
- Tab navigation as subtle pill-shaped buttons with lime background on active
- Asymmetric grid: Large map on left, narrow sidebar on right (desktop)

**Signature Elements:**
- Soft shadow (0 8px 24px rgba(192, 241, 28, 0.1)) on cards for depth
- Lime pill badges for pricing tiers (Economy, Business, Premium)
- Animated lime progress ring for seat availability
- Branded transit company logos in lime-tinted circles

**Interaction Philosophy:**
- Smooth transitions between states (250ms ease-in-out)
- Hover states: Card lifts slightly with enhanced shadow
- Focus states: Lime outline with 2px width
- Micro-interactions: Lime pulse on new fare arrival

**Animation:**
- Card entrance: Fade in + slide up (300ms ease-out)
- Fare update: Subtle pulse on price change (400ms ease-in-out)
- Map route: Smooth line draw with lime glow trail (2.5s)
- Tab switch: Smooth pill movement with 200ms ease-out

**Typography System:**
- Display: Clash Grotesk Bold (modern, premium)
- Body: Inter Regular (accessible, refined)
- Hierarchy: 36px / 28px / 18px / 14px
- Generous line-height (1.6) for luxury feel

---

## Approach 3: Energy & Motion (Probability: 0.06)

**Design Movement:** Kinetic design meets African vibrancy—think racing game UI meets Lagos energy.

**Core Principles:**
- Motion-first: Animation is not polish, it's communication
- Bold typography: Large, expressive type that commands attention
- Layered depth: Multiple animated planes create sense of speed
- Vibrant confidence: Lime is everywhere, pulsing with energy

**Color Philosophy:**
- Pure black background (#000000) as neutral canvas
- Neon lime (#C0F11C) as primary color—used liberally for energy
- Accent lime variations: Slightly darker (#B0E10C) for secondary elements
- Subtle lime glow effects (box-shadow) for depth and movement

**Layout Paradigm:**
- Staggered, overlapping cards that create visual rhythm
- Diagonal section dividers with lime accent lines
- Tab navigation as animated pill buttons with lime underline that slides
- Responsive: Cards stack with overlapping effect on mobile

**Signature Elements:**
- Animated lime underline on active tab that "snaps" into place
- Pulsing lime dot indicators for real-time updates
- Lime gradient text for section headers
- Animated lime border on fare cards (border-image animation)

**Interaction Philosophy:**
- Every interaction triggers motion: clicks, hovers, scrolls
- Staggered animations for grouped elements
- Haptic-like feedback through scale and color shifts
- Continuous subtle motion (breathing effects on idle states)

**Animation:**
- Button press: Scale 0.95 with 100ms ease-out, lime glow pulse
- Fare card entry: Staggered slide-up (150ms each, 60ms stagger)
- Tab switch: Lime underline slides with 250ms ease-out
- Map route: Lime line draws with trailing glow effect (2s)
- Idle state: Subtle pulse on all interactive elements (2s loop)

**Typography System:**
- Display: Space Mono Bold (monospace, energetic)
- Body: Plus Jakarta Sans Regular (modern, friendly)
- Hierarchy: 40px / 32px / 20px / 16px
- Bold weights for emphasis throughout

---

## Selected Approach: **Cyberpunk Minimalism**

This approach balances the premium requirements with the app's functional purpose. The extreme contrast between pure black and neon lime creates an instantly recognizable, high-impact visual identity that screams "premium tech." The geometric precision and information density align perfectly with a transit comparison app where users need quick, clear decisions. The minimalist philosophy prevents visual clutter while the cyberpunk edge gives it Nigerian tech credibility.

**Why this works:**
- Neon lime stands out maximally against pure black (WCAG AAA compliant)
- Geometric design feels modern and trustworthy (critical for fintech/transit)
- Minimalism keeps mobile performance high (important for low-battery consumption)
- Cyberpunk aesthetic resonates with tech-savvy Nigerian users
- Easy to implement brand logos without visual competition
