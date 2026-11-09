/** Epley estimated one-rep max. */
export function e1rm(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}
