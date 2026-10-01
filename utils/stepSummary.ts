export type StepValue = { day: string; steps: number | null };

export function summarizeSteps(days: StepValue[]) {
  const recorded = days.filter((day): day is StepValue & { steps: number } => day.steps !== null);
  const total = recorded.reduce((sum, day) => sum + day.steps, 0);
  return {
    total: recorded.length ? total : null,
    average: recorded.length ? Math.round(total / recorded.length) : null,
    recordedDays: recorded.length,
    maximum: Math.max(0, ...recorded.map(day => day.steps)),
  };
}

export function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(year, value - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
