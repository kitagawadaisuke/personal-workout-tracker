import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type StepDay = { day: string; steps: number | null };

type HealthModule = {
  isAvailable(): boolean;
  requestStepAccess(): Promise<void>;
  getDailySteps(day: string): Promise<number | null>;
  getMonthlySteps(month: string): Promise<StepDay[]>;
};

// Optional loading keeps Expo Go and platforms without HealthKit usable.
const native = Platform.OS === 'ios'
  ? requireOptionalNativeModule<HealthModule>('SlowRepHealth')
  : null;

export const isStepHistoryAvailable = () => native?.isAvailable() ?? false;

export async function requestStepAccess() {
  if (!native) throw new Error('HealthKit is unavailable');
  await native.requestStepAccess();
}

export async function getDailySteps(day: string) {
  if (!native) throw new Error('HealthKit is unavailable');
  return native.getDailySteps(day);
}

export async function getMonthlySteps(month: string) {
  if (!native) throw new Error('HealthKit is unavailable');
  return native.getMonthlySteps(month);
}
