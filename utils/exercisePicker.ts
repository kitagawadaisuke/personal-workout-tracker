import type { DailyWorkout } from '../types/workout';

export const countExerciseDays = (workouts: DailyWorkout[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    for (const type of new Set(workout.exercises.map((exercise) => exercise.type))) {
      counts.set(type, (counts.get(type) || 0) + 1);
    }
  }
  return counts;
};

export const sortExerciseTypes = <T extends string>(
  types: T[],
  counts: Map<string, number>,
  savedOrder: string[],
  sort: 'frequency' | 'custom'
): T[] => {
  const savedPositions = new Map(savedOrder.map((type, index) => [type, index]));
  const originalPositions = new Map(types.map((type, index) => [type, index]));
  return [...types].sort((a, b) => {
    if (sort === 'frequency') {
      const usageDifference = (counts.get(b) || 0) - (counts.get(a) || 0);
      if (usageDifference !== 0) return usageDifference;
    }
    const aPosition = savedPositions.get(a);
    const bPosition = savedPositions.get(b);
    if (aPosition !== undefined && bPosition !== undefined) return aPosition - bPosition;
    if (aPosition !== undefined) return -1;
    if (bPosition !== undefined) return 1;
    return (originalPositions.get(a) || 0) - (originalPositions.get(b) || 0);
  });
};

export const moveExerciseType = <T extends string>(types: T[], type: T, direction: -1 | 1): T[] => {
  const index = types.indexOf(type);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= types.length) return types;
  const reordered = [...types];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  return reordered;
};
