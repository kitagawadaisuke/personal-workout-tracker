import { MD3DarkTheme } from 'react-native-paper';
import { LocaleConfig } from 'react-native-calendars';

const monthNames = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
LocaleConfig.locales.ja = {
  monthNames,
  monthNamesShort: monthNames,
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#9BE2C2',
    primaryContainer: '#244C40',
    onPrimaryContainer: '#CBF7E4',
    secondary: '#9BE2C2',
    secondaryContainer: '#244C40',
    onSecondaryContainer: '#CBF7E4',
    background: '#101815',
    surface: '#1A2520',
    surfaceVariant: '#24332C',
    error: '#FF9D96',
    onPrimary: '#102A20',
    onSecondary: '#102A20',
    onBackground: '#F2F6F3',
    onSurface: '#F2F6F3',
    onSurfaceVariant: '#A8B9AF',
    outline: '#53695D',
    outlineVariant: '#304238',
  },
};

export const colors = {
  pushup: '#3b82f6',    // blue
  squat: '#22c55e',     // green
  pullup: '#f59e0b',    // amber
  cardio: '#f472b6',    // pink bright
  bodypump: '#a855f7',  // purple
  bodycombat: '#ef4444', // red
  leapfight: '#f97316', // orange
  swimming: '#06b6d4',  // cyan
  strength: '#818cf8',  // indigo bright
  both: '#c084fc',      // purple bright
};

export const calendarTheme = {
  backgroundColor: darkTheme.colors.background,
  calendarBackground: darkTheme.colors.surface,
  textSectionTitleColor: darkTheme.colors.onSurfaceVariant,
  selectedDayBackgroundColor: darkTheme.colors.primaryContainer,
  selectedDayTextColor: darkTheme.colors.onPrimaryContainer,
  todayTextColor: darkTheme.colors.primary,
  dayTextColor: darkTheme.colors.onSurface,
  textDisabledColor: '#65786C',
  dotColor: darkTheme.colors.primary,
  selectedDotColor: darkTheme.colors.onPrimaryContainer,
  arrowColor: darkTheme.colors.primary,
  monthTextColor: darkTheme.colors.onSurface,
  indicatorColor: darkTheme.colors.primary,
  textDayFontWeight: '400' as const,
  textMonthFontWeight: '600' as const,
  textDayHeaderFontWeight: '500' as const,
};
