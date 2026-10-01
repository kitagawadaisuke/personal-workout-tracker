import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { Text, Button, List, Portal, Dialog, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Calendar } from 'react-native-calendars';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme, calendarTheme } from '@/constants/theme';
import { exportToJson, filterWorkoutsByDateRange } from '@/utils/export';
import { isDurationBasedExercise } from '@/types/workout';

// --- StatBlock component ---
const StatBlock = ({ value, label }: { value: string; label: string }) => (
  <View style={statStyles.block}>
    <Text
      style={statStyles.value}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {value}
    </Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  block: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default function SettingsScreen() {
  const { getAllWorkouts, customExercises } = useWorkoutStore();
  const appVersion = Constants.expoConfig?.version ?? '1.0.3';
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportRange, setExportRange] = useState<'all' | 'week' | 'month' | 'day'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedExportDate, setSelectedExportDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const workouts = getAllWorkouts();

  const toLocalDateString = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDateRange = (range: 'all' | 'week' | 'month' | 'day') => {
    const today = new Date();
    const endDate = toLocalDateString(today);

    if (range === 'all') {
      return { start: '1970-01-01', end: endDate };
    }

    if (range === 'day') {
      return { start: selectedExportDate, end: selectedExportDate };
    }

    const startDate = new Date();
    if (range === 'week') {
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate.setMonth(today.getMonth() - 1);
    }

    return {
      start: toLocalDateString(startDate),
      end: endDate,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { start, end } = getDateRange(exportRange);
      const filteredWorkouts = exportRange === 'all' && start === '1970-01-01'
        ? workouts
        : filterWorkoutsByDateRange(workouts, start, end);

      if (filteredWorkouts.length === 0) {
        Alert.alert('エクスポート', 'エクスポートするデータがありません');
        return;
      }

      const success = await exportToJson(filteredWorkouts);
      if (success) {
        setExportDialogVisible(false);
      } else {
        Alert.alert('エラー', 'エクスポートに失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', 'エクスポート中にエラーが発生しました');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDurationMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${minutes}分`;
    return remainingMinutes > 0 ? `${hours}時間${remainingMinutes}分` : `${hours}時間`;
  };

  const calcStats = (targetWorkouts: typeof workouts) => {
    const isDurationExercise = (type: string) => {
      return customExercises.find((e) => e.id === type)?.isDuration || isDurationBasedExercise(type);
    };

    return {
      trainingDays: targetWorkouts.filter((workout) => workout.exercises.length > 0 || (workout.durationSeconds ?? 0) > 0).length,
      totalExerciseDurationMinutes: targetWorkouts.reduce(
        (sum, w) => sum + w.exercises
          .filter((e) => isDurationExercise(e.type))
          .reduce((s, e) => s + (e.durationMinutes || 0), 0),
        0
      ),
    };
  };

  const yearlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearWorkouts = workouts.filter((w) => w.date.startsWith(String(currentYear)));
    return calcStats(yearWorkouts);
  }, [workouts, customExercises]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthWorkouts = workouts.filter((w) => w.date.startsWith(currentMonth));
    return calcStats(monthWorkouts);
  }, [workouts, customExercises]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>運動した日数と有酸素の時間を振り返る</Text>

        {/* --- 今月の統計 --- */}
        <Text style={styles.sectionHeader}>今月の実績</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <StatBlock value={`${monthlyStats.trainingDays}日`} label="トレーニングした日" />
            <View style={styles.statDivider} />
            <StatBlock value={formatDurationMinutes(monthlyStats.totalExerciseDurationMinutes)} label="有酸素の時間" />
          </View>
        </View>

        {/* --- 今年の統計 --- */}
        <Text style={styles.sectionHeader}>今年の実績</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <StatBlock value={`${yearlyStats.trainingDays}日`} label="トレーニングした日" />
            <View style={styles.statDivider} />
            <StatBlock value={formatDurationMinutes(yearlyStats.totalExerciseDurationMinutes)} label="有酸素の時間" />
          </View>
        </View>

        {/* --- データ --- */}
        <Text style={styles.sectionHeader}>データ</Text>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="トレーニング記録をエクスポート" style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.65 }]} onPress={() => setExportDialogVisible(true)}>
            <View style={styles.listIconWrap}>
              <MaterialCommunityIcons name="export" size={18} color={darkTheme.colors.primary} />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>記録をエクスポート</Text>
              <Text style={styles.listDesc}>バックアップ・AI分析用にJSONで保存</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={darkTheme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* --- アプリ情報 --- */}
        <Text style={styles.sectionHeader}>アプリ</Text>
        <View style={styles.card}>
          <View style={styles.listRow}>
            <View style={styles.listIconWrap}>
              <MaterialCommunityIcons name="information-outline" size={18} color={darkTheme.colors.onSurfaceVariant} />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>バージョン</Text>
              <Text style={styles.listDesc}>{appVersion}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={exportDialogVisible}
          onDismiss={() => setExportDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>データをエクスポート</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>エクスポート範囲を選択</Text>
            <RadioButton.Group
              value={exportRange}
              onValueChange={(value) => setExportRange(value as 'all' | 'week' | 'month' | 'day')}
            >
              <RadioButton.Item
                label="すべてのデータ"
                value="all"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="過去1週間"
                value="week"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="過去1ヶ月"
                value="month"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="日付指定"
                value="day"
                labelStyle={styles.radioLabel}
              />
            </RadioButton.Group>
            {exportRange === 'day' && (
              <Calendar
              monthFormat="yyyy年 M月"
                current={selectedExportDate}
                onDayPress={(day: { dateString: string }) => setSelectedExportDate(day.dateString)}
                markedDates={{
                  [selectedExportDate]: { selected: true, selectedColor: darkTheme.colors.primaryContainer },
                }}
                theme={calendarTheme}
                style={styles.exportCalendar}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportDialogVisible(false)}>キャンセル</Button>
            <Button
              mode="contained"
              onPress={handleExport}
              loading={isExporting}
              disabled={isExporting}
            >
              エクスポート
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { paddingHorizontal: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  introText: { fontSize: 14, color: darkTheme.colors.onSurfaceVariant, marginTop: 20, lineHeight: 22 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.outlineVariant,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: darkTheme.colors.outlineVariant,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  listIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: darkTheme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: darkTheme.colors.onSurface,
  },
  listDesc: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.outlineVariant,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  dialog: {
    backgroundColor: darkTheme.colors.surface,
    width: '90%', maxWidth: 560, alignSelf: 'center', marginHorizontal: 0,
  },
  dialogText: {
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  radioLabel: {
    color: darkTheme.colors.onSurface,
  },
  exportCalendar: {
    borderRadius: 16,
    marginTop: 8,
  },
});
