---
name: Yahtzee Trainer
description: A paper-like Yahtzee practice tool that teaches optimal play with quiet clarity.
colors:
  paper: "oklch(92.5% 0.018 84)"
  sheet: "oklch(97.8% 0.007 86)"
  sheet-alt: "oklch(95.2% 0.013 85)"
  ink: "oklch(12% 0.010 52)"
  ink-mid: "oklch(36% 0.010 58)"
  ink-light: "oklch(56% 0.012 68)"
  ink-faint: "oklch(74% 0.014 78)"
  rule: "oklch(72% 0.016 82)"
  rule-heavy: "oklch(16% 0.008 50)"
  hand-filled: "oklch(19% 0.062 268)"
  hand-zero: "oklch(46% 0.150 22)"
  hand-pencil: "oklch(36% 0.132 252)"
  hand-green: "oklch(40% 0.116 145)"
  ok: "oklch(42% 0.112 145)"
  ok-bg: "oklch(94.5% 0.018 145)"
  err: "oklch(46% 0.162 22)"
  err-bg: "oklch(95.8% 0.022 22)"
  hover: "oklch(91.5% 0.036 265)"
typography:
  display:
    fontFamily: "'Caveat', cursive"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 2.2vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
  title:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.09em"
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.09em"
rounded:
  tight: "2px"
  control: "8px"
spacing:
  compact: "0.5rem"
  base: "1rem"
  roomy: "1.5rem"
  spacious: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.tight}"
    padding: "0.5rem 1.875rem"
    typography: "{typography.title}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-mid}"
    rounded: "{rounded.tight}"
    padding: "0.5rem 1.875rem"
    typography: "{typography.title}"
  scorecard-panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tight}"
    padding: "0"
  feedback-correct:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    rounded: "{rounded.tight}"
    padding: "clamp(0.875rem, 1.8vw, 1.25rem) clamp(1.25rem, 2.5vw, 1.75rem)"
  feedback-wrong:
    backgroundColor: "{colors.err-bg}"
    textColor: "{colors.err}"
    rounded: "{rounded.tight}"
    padding: "clamp(0.875rem, 1.8vw, 1.25rem) clamp(1.25rem, 2.5vw, 1.75rem)"
  die:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    width: "clamp(58px, 7.5vw, 72px)"
    height: "clamp(58px, 7.5vw, 72px)"
---

# Design System: Yahtzee Trainer

## Overview

**Creative North Star: "The Swiss Score Sheet"**

This system treats Yahtzee practice as a tactile desk activity, not a game lobby and not a dashboard. The interface feels like a carefully typeset score pad under good light: printed structure in restrained neutrals, handwritten marks only where the player's progress becomes personal, and realistic dice that anchor the whole experience in something physical and trustworthy.

The overall tone is approachable, paper-like, and disciplined. The product should feel calm enough for casual players, but precise enough that optimal-play feedback reads as credible. Color is intentionally scarce. Layout rhythm, border weight, and white space do most of the work. When feedback appears, the system earns the right to use green or red because those moments carry meaning.

This system explicitly rejects casino energy, mobile-game gimmicks, glossy gamification, and generic SaaS dashboard patterns. It should also avoid decorative effects that break the score-sheet metaphor or make the trainer feel toy-like.

**Key Characteristics:**
- Printed structure with handwritten moments
- Mostly monochrome surfaces with functional feedback color
- Flat, bordered layout with measured spacing and strong alignment
- Realistic dice as the tactile focal object
- Swiss-influenced restraint, never sterile minimalism

## Colors

The palette is a restrained paper system: warm neutrals carry the interface, dark ink defines structure, and color appears only when the app is teaching.

### Primary
- **Ledger Ink** (`oklch(12% 0.010 52)`): The main text and high-contrast control color. It is also the primary action fill, which keeps the UI mostly black-and-white while still feeling deliberate.
- **Ballpoint Blue** (`oklch(19% 0.062 268)`): The handwritten filled-score color. It marks committed entries and score outcomes with a human, marked-up quality rather than a system-blue UI accent.

### Secondary
- **Verdict Green** (`oklch(42% 0.112 145)`): Used only for correct feedback, earned bonus states, and other clearly positive instructional moments.
- **Correction Red** (`oklch(46% 0.162 22)`): Used only for suboptimal decisions, zero states, and other meaningful negative feedback.

### Neutral
- **Paper Field** (`oklch(92.5% 0.018 84)`): The ambient page background in light mode.
- **Score Sheet White** (`oklch(97.8% 0.007 86)`): The main printed surface for scorecard, play area, and feedback containers.
- **Alternate Sheet Fill** (`oklch(95.2% 0.013 85)`): Subtotal, bonus, and supportive rows that need light tonal separation without becoming card-like.
- **Mid Ink** (`oklch(36% 0.010 58)`): Secondary information, structured copy, and less dominant button text.
- **Faded Ink** (`oklch(56% 0.012 68)`): Tertiary copy, helper text, and inactive interface details.
- **Grid Rule** (`oklch(72% 0.016 82)`): Standard borders and form grid lines.
- **Heavy Rule** (`oklch(16% 0.008 50)`): Structural rules, section separators, and scorecard framing.

### Named Rules
**The Feedback-Only Color Rule.** Green and red are not decorative accents. They appear only when the system is evaluating a move, rewarding a milestone, or indicating a meaningful state difference.

**The Paper-First Rule.** Most surfaces should stay inside the paper-and-ink range. If a screen starts to feel color-led instead of structure-led, pull it back.

**Dark Mode as Night Paper.** Dark mode is not neon inversion. It should feel like amber-lit paper in a dim room, with warm neutrals and preserved legibility rather than cold black panels.

## Typography

**Display Font:** `Caveat` (with cursive fallback)  
**Body Font:** `DM Sans` (with system-ui, sans-serif fallback)  
**Label/Mono Font:** `DM Sans` for labels and all-caps utility text

**Character:** DM Sans provides the Swiss discipline, printed clarity, and small-label precision the product needs. Caveat is used sparingly as the handwriting layer, so scores and key outcomes feel entered by hand rather than generated by a dashboard.

### Hierarchy
- **Display** (700, `3rem`, `1.1`): Reserved for high-emphasis handwritten moments such as end-of-game score totals. It should feel like a score written onto the sheet, not like a marketing headline.
- **Headline** (700, `clamp(1.1rem, 2.2vw, 1.5rem)`, `1.1`): Used for the main brand mark and strong sectional anchors. It is compact, uppercase-friendly, and intentionally disciplined.
- **Title** (700, `0.9375rem`, `1.1`): Used for buttons, section totals, and structural emphasis where printed confidence matters more than size.
- **Body** (400, `0.9375rem`, `1.55`): The default reading style for explanatory feedback and app copy. Keep line length near 65ch when introducing longer instructional text.
- **Label** (700, `0.6875rem`, `0.09em`, uppercase): Used for stats, tooltip labels, scorecard section headers, and other machine-like utility text.

### Named Rules
**The Two-Hand Rule.** Printed sans handles structure, navigation, and instruction. Handwriting appears only for values that feel written in or personally achieved.

**The Small-Type Confidence Rule.** Many labels are intentionally small, but they must stay crisp, high-contrast, and well-spaced. Precision is the point, not austerity for its own sake.

## Elevation

This system is flat by default and communicates depth primarily through borders, tonal separation, and stacking order. Most interface sections feel like parts of a single printed artifact. Shadows appear only where the metaphor benefits from physicality, most notably on the dice. The scorecard, controls, and feedback areas should not drift into layered card UI.

### Shadow Vocabulary
- **Dice Resting Shadow** (`0 2px 0 var(--rule), 0 3px 10px oklch(0% 0 0 / 0.08)`): Gives the dice physical presence while keeping them grounded on the paper surface.
- **Dice Hover Shadow** (`0 4px 0 var(--rule), 0 7px 18px oklch(0% 0 0 / 0.11)`): A brief lift to confirm interactivity. It should feel tactile, not glossy.

### Named Rules
**The Flat-Until-Touched Rule.** Surfaces stay flat unless the user is directly interacting with an object that benefits from physical depth.

**The Dice Own the Shadow Rule.** If another component wants the same degree of lift as the dice, it is probably over-designed.

## Components

### Buttons
Buttons are printed controls with strong case, modest padding, and no ornamental styling.
- **Shape:** Tight corners (`2px`) with rectangular geometry.
- **Primary:** Filled with Ledger Ink and set in sheet-colored text. Use for committed actions such as rerolling or continuing.
- **Hover / Focus:** Hover uses simple brightness or border shifts. Keep transitions quick and quiet. Focus should be clear but not glowing.
- **Secondary / Ghost:** Transparent with rule borders and mid-ink text. These should feel like labeled controls on a paper tool, not soft tertiary buttons from a web dashboard.

### Cards / Containers
Containers are really sheet zones, not card stacks.
- **Corner Style:** Mostly square or near-square, typically `2px`.
- **Background:** Score Sheet White or Alternate Sheet Fill, depending on whether the section is primary or supportive.
- **Shadow Strategy:** Flat by default. Borders and section rules define grouping.
- **Border:** Rule-weight borders for standard sections, Heavy Rule where structure needs authority.
- **Internal Padding:** Usually between `1rem` and `2rem`, with larger top/bottom breathing room around the dice.

### Inputs / Fields
The scorecard behaves like an interactive printed form rather than a standard form control set.
- **Style:** Rows and score cells are grid-defined rather than field-box defined.
- **Focus:** Clickable scoring rows shift to the hover tint and switch score numerals into pencil-blue.
- **Error / Disabled:** Zero-value opportunities use correction red in a lighter handwritten scale. Used rows quiet down into faded ink and become non-interactive.

### Navigation
Navigation is minimal and integrated into the header.
- **Style:** Brand mark on the left, utility actions and live stats on the right, all aligned to a single printed header rule.
- **State:** Buttons use subtle hover changes only. The theme toggle and restart control should stay utility-like, never become playful icons.
- **Mobile Treatment:** On smaller screens, the header wraps cleanly while keeping the sense of a single structured tool rather than separate floating controls.

### Scorecard
The scorecard is the signature component and the moral center of the UI.
- **Structure:** Sticky on desktop, framed with heavy borders, and built like a printed ledger with section bars, subtotal rows, and a final total row.
- **Voice:** Labels are printed, values are handwritten. This contrast is essential.
- **State Behavior:** Open rows remain quiet, used rows read as inked-in, clickable rows preview in pencil, and scoring mode may briefly pulse the score column header to direct attention.

### Dice
The dice are the only clearly object-like component in the system.
- **Shape:** Rounded more than the rest of the UI (`8px`) so they feel manufactured and tactile.
- **Surface:** Light sheet-colored body with dark pips and a rule-colored outline.
- **State:** Hover lifts slightly. Kept dice switch into a pencil-tinted hold state. Roll and land animations should feel physical and brief.
- **Importance:** Dice should remain realistic and legible in both themes. They are never abstract glyphs or decorative icons.

### Feedback
Feedback panels are instructional annotations attached directly to the play surface.
- **Correct State:** Green-tinted background with restrained approval language.
- **Incorrect State:** Red-tinted background with comparison table, expected value delta, and a tip that helps the player recover.
- **Tone:** Honest but calm. The panel should teach, not scold.

## Do's and Don'ts

### Do:
- **Do** keep the interface primarily black, white, and gray, with OKLCH-tinted neutrals rather than pure black or pure white.
- **Do** use green and red only for meaningful feedback, earned bonuses, or other explicit evaluation states.
- **Do** preserve realistic dice with strong pip contrast, physical motion, and clearer depth than the rest of the interface.
- **Do** let spacing, borders, and alignment carry most of the visual hierarchy.
- **Do** keep dark mode warm and paper-based, like a score sheet viewed at night, not a cold inverted UI.
- **Do** maintain the printed-versus-handwritten contrast so values feel entered, not merely rendered.

### Don't:
- **Don't** make this feel like a casino interface.
- **Don't** make this feel like a mobile game with gimmicks.
- **Don't** make this feel like a generic SaaS dashboard.
- **Don't** add loud color, decorative effects, or cluttered surfaces that make the trainer feel toy-like or unserious.
- **Don't** drift into glossy gamification or abstract data-tool aesthetics that undermine the paper score-sheet metaphor.
- **Don't** replace border-led structure with stacks of soft cards, floating panels, or glassmorphism.
- **Don't** use green, red, or blue as ambient branding accents across the app. Their rarity is part of their meaning.
