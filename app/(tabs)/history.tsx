import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Calendar, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme, calendarTheme, colors } from '@/constants/theme';
import { EXERCISE_ICONS } from '@/types/workout';
import MonthlyStepsCard from '@/components/MonthlyStepsCard';

type MarkedDates = {
  [key: string]: {
    dots?: Array<{ key: string; color: string }>;
    marked?: boolean;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function HistoryScreen() {
  const { getAllWorkouts, getWorkoutByDate, customExercises, removeTimerRecord, removeWorkoutDuration } = useWorkoutStore();
  const selectedDate = useWorkoutStore((state) => state.selectedDate);
  const setSelectedDate = useWorkoutStore((state) => state.setSelectedDate);
  const router = useRouter();
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  useEffect(() => { setVisibleMonth(selectedDate.slice(0, 7)); }, [selectedDate]);

  const handleDeleteWorkoutDuration = (date: string) => {
    Alert.alert(
      '筋トレ時間の削除',
      'この筋トレ時間の記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => removeWorkoutDuration(date) },
      ]
    );
  };

  const handleDeleteTimerRecord = (date: string, index: number, recordType: string) => {
    Alert.alert(
      'タイマー記録の削除',
      `この${recordType === 'interval' ? '休憩時間' : 'メトロノーム'}記録を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => removeTimerRecord(date, index) },
      ]
    );
  };

  const workouts = getAllWorkouts();

  const markedDates = useMemo(() => {
    const marks: MarkedDates = {};

    workouts.forEach((workout) => {
      const uniqueExercises = new Map<string, string>();

      workout.exercises.forEach((exercise) => {
        const customExercise = customExercises.find((e) => e.id === exercise.type);
        const color = customExercise?.color || colors[exercise.type as keyof typeof colors] || colors.strength;
        uniqueExercises.set(exercise.type, color);
      });

      const dots = Array.from(uniqueExercises.entries()).map(([type, color]) => ({
        key: type,
        color: color,
      }));

      const hasRecord = workout.exercises.length > 0 || (workout.durationSeconds ?? 0) > 0 || (workout.timerRecords?.length ?? 0) > 0;
      marks[workout.date] = {
        marked: hasRecord,
        dots: dots.length > 0 ? dots.slice(0, 3) : hasRecord ? [{ key: 'timer', color: darkTheme.colors.primary }] : [],
      };
    });

    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: darkTheme.colors.primaryContainer,
      };
    }

    return marks;
  }, [workouts, selectedDate, customExercises]);

  const selectedWorkout = selectedDate ? getWorkoutByDate(selectedDate) : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs > 0 ? ` ${secs}秒` : ''}`;
  };

  const getExerciseColor = (type: string) => {
    const customExercise = customExercises.find((e) => e.id === type);
    if (customExercise) return customExercise.color;
    return colors[type as keyof typeof colors] || colors.strength;
  };

  const getExerciseIcon = (type: string): string => {
    const customExercise = customExercises.find((e) => e.id === type);
    if (customExercise) return customExercise.icon;
    return EXERCISE_ICONS[type] || 'dumbbell';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pageContent}>
      <Text style={styles.introText}>1ヶ月の活動とトレーニングを振り返る</Text>
      <MonthlyStepsCard month={visibleMonth} onMonthChange={setVisibleMonth} />
      <Calendar
        monthFormat="yyyy年 M月"
        key={visibleMonth}
        current={`${visibleMonth}-01`}
        onMonthChange={(date: DateData) => setVisibleMonth(date.dateString.slice(0, 7))}
        firstDay={1}
        theme={calendarTheme}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        enableSwipeMonths
        style={styles.calendar}
      />

      <Text style={styles.calendarHint}>● 記録あり · 日付をタップして種目とセットを確認</Text>
      <View style={styles.detailsContent}>
        {selectedDate && (
          <Text style={styles.selectedDateText}>
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        )}
        {selectedDate ? (
          <Button mode="outlined" icon={selectedWorkout ? 'pencil-outline' : 'plus'} style={styles.editButton} onPress={() => { router.navigate('/'); }}>
            {selectedWorkout ? 'この日の記録を編集' : 'この日にトレーニングを記録'}
          </Button>
        ) : null}

        {selectedWorkout ? (
          <>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text style={styles.summaryTitle}>トレーニング内容</Text>

                {selectedWorkout.exercises.map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseBlock}>
                    {/* 種目ヘッダー（名前＋サマリー） */}
                    <View style={styles.exerciseHeaderRow}>
                      <View style={styles.exerciseHeaderLeft}>
                        <MaterialCommunityIcons
                          name={getExerciseIcon(exercise.type) as any}
                          size={16}
                          color={getExerciseColor(exercise.type)}
                        />
                        <Text style={[styles.summaryLabel, { fontWeight: '600', color: darkTheme.colors.onSurface }]}>
                          {exercise.name}
                        </Text>
                      </View>
                      <Text style={styles.summaryValue}>
                        {exercise.durationMinutes
                          ? `${exercise.durationMinutes}分`
                          : exercise.duration
                          ? formatDuration(exercise.duration)
                          : `${exercise.sets.length}セット / ${exercise.sets.reduce((sum, s) => sum + s.entries.reduce((es, e) => es + e.reps, 0), 0)}回`}
                      </Text>
                    </View>

                    {/* セット詳細 */}
                    {exercise.sets.length > 0 && !exercise.durationMinutes && !exercise.duration && (
                      <View style={styles.setsDetail}>
                        {exercise.sets.map((set, index) => (
                          <View key={index} style={styles.setDetailRow}>
                            <Text style={styles.setDetailLabel}>
                              {index + 1}セット目
                            </Text>
                            <Text style={styles.setDetailText}>
                              {set.entries.map((entry) =>
                                `${entry.reps}回${entry.weight ? ` ${entry.weight}kg` : ''}${entry.variation ? ` ${entry.variation}` : ''}${entry.tempo ? ` (${entry.tempo})` : ''}`
                              ).join(' / ')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                {((selectedWorkout.durationSeconds ?? 0) > 0 || (selectedWorkout.timerRecords && selectedWorkout.timerRecords.length > 0)) && (
                  <>
                    <Text style={[styles.summaryTitle, { marginTop: 16 }]}>タイマー記録</Text>
                    {(selectedWorkout.durationSeconds ?? 0) > 0 && (
                      <Pressable
                        onPress={() => handleDeleteWorkoutDuration(selectedDate!)}
                        style={styles.summaryRow}
                      >
                        <Text style={styles.summaryLabel}>筋トレ時間</Text>
                        <Text style={styles.summaryValue}>
                          {formatDuration(selectedWorkout.durationSeconds!)}
                        </Text>
                      </Pressable>
                    )}
                    {selectedWorkout.timerRecords?.map((record, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleDeleteTimerRecord(selectedDate!, index, record.type)}
                        style={styles.summaryRow}
                      >
                        <Text style={styles.summaryLabel}>
                          {record.type === 'interval' ? '休憩時間' : 'メトロノーム'}
                        </Text>
                        <Text style={styles.summaryValue}>
                          {record.type === 'interval'
                            ? formatDuration(record.intervalSeconds || 0)
                            : `${record.metronomeBpm} BPM (${record.metronomeBeats}拍子)`}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </Card.Content>
            </Card>
          </>
        ) : selectedDate ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={48}
                color={darkTheme.colors.onSurfaceVariant}
              />
              <Text style={styles.emptyText}>この日の筋トレ記録はありません</Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="gesture-tap"
                size={48}
                color={darkTheme.colors.onSurfaceVariant}
              />
              <Text style={styles.emptyText}>日付をタップして詳細を表示</Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  calendarHint: { color: darkTheme.colors.onSurfaceVariant, fontSize: 12, marginTop: 12 },
  pageContent: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20 },
  introText: { fontSize: 14, color: darkTheme.colors.onSurfaceVariant, marginBottom: 20 },
  editButton: { marginBottom: 16 },
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  calendar: {
    borderRadius: 20,
    padding: 8,
    overflow: 'hidden',
  },
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: darkTheme.colors.onSurfaceVariant,
  },
  summaryValue: {
    color: darkTheme.colors.onSurface,
    fontWeight: '500',
  },
  exerciseBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outline,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setsDetail: {
    marginTop: 8,
    paddingLeft: 22,
  },
  setDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  setDetailLabel: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: 8,
  },
  setDetailText: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    flexShrink: 1,
    textAlign: 'right',
  },
  emptyCard: {
    backgroundColor: darkTheme.colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 16,
  },
});
