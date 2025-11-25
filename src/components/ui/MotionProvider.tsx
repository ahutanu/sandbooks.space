import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Spring transition matching fluid interface guidelines.
 * Uses ~80% damping for smooth motion that feels alive without excessive bounce.
 */
const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
  mass: 1,
};

/**
 * Fallback for users who prefer reduced motion.
 * Instant transitions with no animation.
 */
const reducedMotionTransition = {
  type: 'tween' as const,
  duration: 0.01,
};

interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Global motion configuration provider.
 *
 * Wraps the app with LazyMotion for optimal bundle size and MotionConfig
 * for consistent spring physics across all animated components.
 *
 * Automatically respects prefers-reduced-motion accessibility setting.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        transition={shouldReduceMotion ? reducedMotionTransition : springTransition}
        reducedMotion={shouldReduceMotion ? 'always' : 'never'}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
