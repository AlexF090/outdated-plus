const MILLISECONDS_PER_DAY = 86_400_000;

export const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const daysBetween = (earlier: Date, later: Date): number => {
  return Math.max(
    0,
    Math.floor((later.getTime() - earlier.getTime()) / MILLISECONDS_PER_DAY),
  );
};

export const formatAge = (days: number): string => {
  if (days < 1) {
    return '< 1 day';
  }
  return days === 1 ? '1 day' : `${days} days`;
};
