import type { Variants, Transition } from 'framer-motion';

// =================================================================
// SPRING PRESETS (Fluid Interface Guidelines)
// =================================================================

/**
 * Tool-like: ~100% critical damping, no overshoot.
 * Use for taps, clicks, UI state changes.
 */
export const springCritical: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

/**
 * Smooth: ~80% damping with slight underdamping.
 * Use for panels, modals - feels alive without excessive bounce.
 */
export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 1,
};

/**
 * Bouncy: ~60% damping for gesture-driven motion with momentum.
 * Use for drag releases, swipes, playful interactions.
 */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
  mass: 0.8,
};

/**
 * Gentle: Large surfaces, terminal slide.
 * Slower, more deliberate motion for significant UI changes.
 */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
  mass: 1.2,
};

// =================================================================
// GLASS PANEL VARIANTS
// =================================================================

/**
 * Standard glass panel enter/exit animation.
 * Scale + fade + subtle blur creates depth perception.
 */
export const glassPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: springSmooth,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -4,
    filter: 'blur(2px)',
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

/**
 * Modal backdrop with scrim.
 * Animated backdrop-filter for glassmorphism effect.
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: 0.15, delay: 0.05 },
  },
};

// =================================================================
// STAGGER VARIANTS (for lists, menus)
// =================================================================

/**
 * Container variant for staggered children.
 * Apply to parent element wrapping animated items.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 1,
    transition: {
      staggerChildren: 0.025,
      staggerDirection: -1,
    },
  },
};

/**
 * Individual item variant for staggered lists.
 * Pairs with staggerContainerVariants.
 */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springCritical,
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: 0.12 },
  },
};

// =================================================================
// EXECUTION FEEDBACK (code blocks)
// =================================================================

/**
 * Code block execution states with pulsing ring effect.
 * Provides clear visual feedback for running, success, error states.
 */
export const executionVariants: Variants = {
  idle: {
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  running: {
    boxShadow: [
      '0 0 0 0 rgba(16, 185, 129, 0.4)',
      '0 0 0 6px rgba(16, 185, 129, 0)',
    ],
    borderColor: 'rgba(16, 185, 129, 0.5)',
    transition: {
      boxShadow: { duration: 1, repeat: Infinity, ease: 'easeOut' },
      borderColor: { duration: 0.2 },
    },
  },
  success: {
    boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0.5)', '0 0 0 10px rgba(16, 185, 129, 0)'],
    borderColor: 'rgba(16, 185, 129, 0.6)',
    transition: { duration: 0.5 },
  },
  error: {
    boxShadow: ['0 0 0 0 rgba(239, 68, 68, 0.5)', '0 0 0 6px rgba(239, 68, 68, 0)'],
    borderColor: 'rgba(239, 68, 68, 0.5)',
    transition: { duration: 0.3 },
  },
};

// =================================================================
// QUAKE TERMINAL (drawer pattern)
// =================================================================

/**
 * Quake-style terminal slide-down animation.
 * Uses gentle spring for large surface movement.
 */
export const quakeTerminalVariants: Variants = {
  hidden: {
    y: '-100%',
    opacity: 0.9,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: springGentle,
  },
  exit: {
    y: '-100%',
    opacity: 0.9,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

// =================================================================
// LIST ITEMS (folder tree, notes)
// =================================================================

/**
 * List item enter/exit animation.
 * Horizontal slide with scale for natural hierarchy feel.
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -12, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springCritical,
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

// =================================================================
// INTERACTIVE FEEDBACK (buttons, toggles)
// =================================================================

/**
 * Tap/press feedback - subtle scale down.
 * Apply to whileTap prop.
 */
export const tapFeedback = {
  scale: 0.97,
  transition: { type: 'spring' as const, stiffness: 500, damping: 30 },
};

/**
 * Hover feedback - subtle scale up.
 * Apply to whileHover prop.
 */
export const hoverFeedback = {
  scale: 1.02,
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

// =================================================================
// POPOVER/CONTEXT MENU VARIANTS
// =================================================================

/**
 * Dropdown menu appearing from origin point.
 * Scales from 95% with slight fade for natural emergence.
 */
export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springCritical,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -2,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
};

/**
 * Context menu with origin-aware animation.
 * Quick, snappy appearance matching user intent.
 */
export const contextMenuVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.08 },
  },
};

// =================================================================
// TOOLTIP VARIANTS
// =================================================================

/**
 * Tooltip fade-in with subtle scale.
 * Quick appearance, minimal distraction.
 */
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.1 },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.075 },
  },
};

// =================================================================
// TOAST/NOTIFICATION VARIANTS
// =================================================================

/**
 * Toast notification slide-in from edge.
 * Enters with spring, exits quickly.
 */
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSmooth,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

// =================================================================
// OUTPUT STREAMING VARIANTS (Jupyter outputs, execution results)
// =================================================================

/**
 * Container for output stagger animation.
 * Apply to parent wrapping output items.
 */
export const outputContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/**
 * Standard output block (text, stream).
 * Fade + slide for progressive reveal.
 */
export const outputBlockVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98, filter: 'blur(2px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: springSmooth,
  },
};

/**
 * Rich output (images, charts, HTML).
 * Spring-scale with blur-to-sharp + saturation reveal.
 */
export const richOutputVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(4px) saturate(0)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px) saturate(1)',
    transition: { ...springSmooth, filter: { duration: 0.3 } },
  },
};

/**
 * Error output with attention-grabbing shake.
 * Subtle 2px horizontal shake draws attention without alarming.
 */
export const errorOutputVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: [0, -2, 2, -1, 0],
    transition: { x: { duration: 0.3 }, opacity: { duration: 0.2 } },
  },
};

// =================================================================
// EXECUTION PHASE VARIANTS
// =================================================================

/**
 * Phase text crossfade for execution status.
 * "Starting..." -> "Executing..." -> "Streaming output..."
 */
export const phaseTextVariants: Variants = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: 4, transition: { duration: 0.1 } },
};

/**
 * Execution count badge pop animation.
 * Quick scale pulse when count increments.
 */
export const executionCountVariants: Variants = {
  initial: { scale: 1 },
  update: { scale: [1, 1.15, 1], transition: { duration: 0.25 } },
};

// =================================================================
// ENHANCED EXECUTION FEEDBACK
// =================================================================

/**
 * Enhanced execution states with research-backed animations.
 * Success: 1.5% scale pulse (Apple HIG - subtle but perceptible)
 * Error: 2px shake (draws attention without alarming)
 */
export const enhancedExecutionVariants: Variants = {
  idle: {
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    scale: 1,
    x: 0,
  },
  running: {
    boxShadow: [
      '0 0 0 0 rgba(16, 185, 129, 0.4)',
      '0 0 0 6px rgba(16, 185, 129, 0)',
    ],
    borderColor: 'rgba(16, 185, 129, 0.5)',
    scale: 1,
    x: 0,
    transition: {
      boxShadow: { duration: 1, repeat: Infinity, ease: 'easeOut' },
      borderColor: { duration: 0.2 },
    },
  },
  success: {
    boxShadow: [
      '0 0 0 0 rgba(16, 185, 129, 0.5)',
      '0 0 0 8px rgba(16, 185, 129, 0.3)',
      '0 0 0 10px rgba(16, 185, 129, 0)',
    ],
    borderColor: 'rgba(16, 185, 129, 0.6)',
    scale: [1, 1.015, 1],
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  error: {
    boxShadow: [
      '0 0 0 0 rgba(239, 68, 68, 0.5)',
      '0 0 0 4px rgba(239, 68, 68, 0.4)',
      '0 0 0 6px rgba(239, 68, 68, 0)',
    ],
    borderColor: 'rgba(239, 68, 68, 0.5)',
    scale: 1,
    x: [0, -2, 2, -1.5, 1.5, -1, 1, 0],
    transition: { boxShadow: { duration: 0.4 }, x: { duration: 0.35 } },
  },
};

// =================================================================
// MENU ITEM VARIANTS (for slash menu, dropdowns)
// =================================================================

/**
 * Menu container with glass panel entrance + item stagger.
 * Combines panel animation with child staggering.
 */
export const menuContainerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: -4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springCritical,
      staggerChildren: 0.025,
      delayChildren: 0.05,
    },
  },
};

/**
 * Individual menu item variant.
 * Subtle slide-up with opacity.
 */
export const menuItemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.12, ease: 'easeOut' },
  },
};
