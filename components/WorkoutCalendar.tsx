import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme, calendarTheme } from '@/constants/theme';

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const weekdayNames = ['月', '火', '水', '木', '金', '土', '日'];

export function WorkoutCalendar({ selectedDate, onSelect }: { selectedDate: string; onSelect: (date: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const workouts = useWorkoutStore((state) => state.workouts);
  const today = localDate(new Date());
  const recordedDates = useMemo(() => new Set(workouts.filter((workout) =>
    workout.exercises.length > 0 || (workout.durationSeconds ?? 0) > 0 || (workout.timerRecords?.length ?? 0) > 0
  ).map((workout) => workout.date)), [workouts]);
  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    recordedDates.forEach((date) => { marks[date] = { marked: true, dotColor: darkTheme.colors.primary }; });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: darkTheme.colors.primaryContainer };
    return marks;
  }, [recordedDates, selectedDate]);
  const week = useMemo(() => {
    const start = new Date(`${selectedDate}T12:00:00`);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { key: localDate(date), day: date.getDate() };
    });
  }, [selectedDate]);
  const shiftWeek = (offset: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + offset);
    onSelect(localDate(date));
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.date}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</Text>
        <View style={styles.actions}>
          {selectedDate !== today ? <Button compact onPress={() => onSelect(today)}>今日へ</Button> : null}
          <Button compact icon={expanded ? 'calendar-week' : 'calendar-month'} accessibilityLabel={expanded ? '週間カレンダーに切り替え' : '月間カレンダーを開く'} onPress={() => setExpanded((value) => !value)}>{expanded ? '週表示' : '月表示'}</Button>
        </View>
      </View>
      {expanded ? (
        <Calendar key={selectedDate.slice(0, 7)} current={selectedDate} monthFormat="yyyy年 M月" firstDay={1} theme={calendarTheme} markedDates={markedDates} onDayPress={(day) => onSelect(day.dateString)} enableSwipeMonths />
      ) : (
        <>
          <View style={styles.weekNavigation}>
            <IconButton icon="chevron-left" size={20} accessibilityLabel="前の週" onPress={() => shiftWeek(-7)} style={styles.arrow} />
            <Text style={styles.month}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</Text>
            <IconButton icon="chevron-right" size={20} accessibilityLabel="次の週" onPress={() => shiftWeek(7)} style={styles.arrow} />
          </View>
          <View style={styles.week}>
            {week.map(({ key, day }, index) => (
              <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key}の記録${recordedDates.has(key) ? '、記録あり' : ''}`} accessibilityState={{ selected: key === selectedDate }} onPress={() => onSelect(key)} style={({ pressed }) => [styles.day, key === selectedDate && styles.selectedDay, pressed && { opacity: 0.65 }]}>
                <Text style={styles.weekday}>{weekdayNames[index]}</Text>
                <Text style={[styles.dayNumber, key === today && { color: darkTheme.colors.primary }]}>{day}</Text>
                <View style={[styles.dot, !recordedDates.has(key) && { opacity: 0 }]} />
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={styles.legend}>● 記録あり · 日付をタップしてメニューを表示</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12, borderRadius: 16, padding: 10, backgroundColor: darkTheme.colors.surface },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 15, fontWeight: '700', color: darkTheme.colors.onSurface, paddingLeft: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  weekNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { margin: 0 },
  month: { fontSize: 12, color: darkTheme.colors.onSurfaceVariant },
  week: { flexDirection: 'row', gap: 3 },
  day: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 4 },
  selectedDay: { backgroundColor: darkTheme.colors.primaryContainer },
  weekday: { fontSize: 11, color: darkTheme.colors.onSurfaceVariant },
  dayNumber: { fontSize: 17, fontWeight: '600', color: darkTheme.colors.onSurface },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: darkTheme.colors.primary },
  legend: { fontSize: 11, color: darkTheme.colors.onSurfaceVariant, marginTop: 10, marginLeft: 4 },
});
