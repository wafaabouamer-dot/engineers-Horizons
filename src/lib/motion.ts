/** Apple's motion settings (WWDC Designing Fluid Interfaces) for `motion/react`. */
export const springs = {
  /** Most UI: critically damped, no overshoot. */
  default: { type: 'spring', bounce: 0, duration: 0.4 },
  /** Small, quick moves: segments, switches, chips. */
  snappy: { type: 'spring', bounce: 0, duration: 0.3 },
  /** Only after a flick or a throw: a little overshoot. */
  momentum: { type: 'spring', bounce: 0.2, duration: 0.4 },
} as const;

/** Where a flick comes to rest (px), from its release velocity (px/s). Snap to the target nearest this. */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** How far an element follows a drag past its edge: less the further it goes. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
