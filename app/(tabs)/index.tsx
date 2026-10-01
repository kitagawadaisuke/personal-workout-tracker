import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { View, ScrollView, StyleSheet, TextInput as RNTextInput, Alert, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { WorkoutCalendar } from '@/components/WorkoutCalendar';
import { Swipeable } from 'react-native-gesture-handler';
import { Text, Card, Button, IconButton, TextInput, Portal, Dialog, Switch, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore } from '@/stores/workoutStore';
import { countExerciseDays, sortExerciseTypes, moveExerciseType } from '@/utils/exercisePicker';
import { useShallow } from 'zustand/react/shallow';
import { darkTheme, colors } from '@/constants/theme';
import { ExerciseType, BuiltinExerciseType, Exercise, EXERCISE_ICONS, isDurationBasedExercise, DURATION_PRESETS, BUILTIN_EXERCISE_NAMES } from '@/types/workout';

const EMPTY_EXERCISES: Exercise[] = [];

// --- Helper functions (hoisted, stable references) ---

const getExerciseColor = (type: ExerciseType, customExercises: { id: string; color: string }[]): string => {
  const custom = customExercises.find((e) => e.id === type);
  if (custom) return custom.color;
  return (colors as Record<string, string>)[type] || colors.strength;
};

const getExerciseIcon = (type: ExerciseType, customExercises: { id: string; icon: string }[]): string => {
  const custom = customExercises.find((e) => e.id === type);
  if (custom) return custom.icon;
  return (EXERCISE_ICONS as Record<string, string>)[type] || 'dumbbell';
};

const isExerciseDurationBased = (
  type: ExerciseType,
  customExercises: { id: string; isDuration: boolean }[]
): boolean => {
  return customExercises.find((e) => e.id === type)?.isDuration || isDurationBasedExercise(type);
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- IME対応TextInputコンポーネント ---
interface IMESafeTextInputProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  style?: any;
  outlineColor?: string;
  activeOutlineColor?: string;
}

const IMESafeTextInput = memo<IMESafeTextInputProps>(({
  label,
  value,
  onSave,
  placeholder,
  style,
  outlineColor,
  activeOutlineColor,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleEndEditing = useCallback(() => {
    const trimmedValue = localValue.trim();
    if (trimmedValue !== value) {
      onSave(trimmedValue);
    }
  }, [localValue, value, onSave]);

  const handleFocus = useCallback(() => { isFocusedRef.current = true; }, []);
  const handleBlur = useCallback(() => { isFocusedRef.current = false; }, []);

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={localValue}
      onChangeText={setLocalValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onEndEditing={handleEndEditing}
      placeholder={placeholder}
      style={style}
      outlineColor={outlineColor}
      activeOutlineColor={activeOutlineColor}
      dense
    />
  );
});

// --- SetEntryRow コンポーネント ---
interface SetEntryRowProps {
  exerciseId: string;
  exerciseType: ExerciseType;
  setIndex: number;
  entryIndex: number;
  reps: number;
  weight?: number;
  variation?: string;
  tempo?: string;
  showEntryHeader: boolean;
  exerciseColor: string;
}

const SetEntryRow = memo<SetEntryRowProps>(({
  exerciseId,
  exerciseType,
  setIndex,
  entryIndex,
  reps,
  weight,
  variation,
  tempo,
  showEntryHeader,
  exerciseColor,
}) => {
  const updateEntryReps = useWorkoutStore((s) => s.updateEntryReps);
  const updateEntryWeight = useWorkoutStore((s) => s.updateEntryWeight);
  const updateEntryVariation = useWorkoutStore((s) => s.updateEntryVariation);
  const updateEntryTempo = useWorkoutStore((s) => s.updateEntryTempo);
  const removeSetEntry = useWorkoutStore((s) => s.removeSetEntry);

  const [isOpen, setIsOpen] = useState(false);
  const toggleDetail = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleRepsChange = useCallback((text: string) => {
    updateEntryReps(exerciseId, setIndex, entryIndex, parseInt(text, 10) || 0);
  }, [exerciseId, setIndex, entryIndex, updateEntryReps]);

  const handleWeightChange = useCallback((text: string) => {
    const w = parseFloat(text);
    updateEntryWeight(exerciseId, setIndex, entryIndex, Number.isFinite(w) ? w : 0);
  }, [exerciseId, setIndex, entryIndex, updateEntryWeight]);

  const handleVariationSave = useCallback((text: string) => {
    updateEntryVariation(exerciseId, setIndex, entryIndex, text);
  }, [exerciseId, setIndex, entryIndex, updateEntryVariation]);

  const handleTempoSave = useCallback((text: string) => {
    updateEntryTempo(exerciseId, setIndex, entryIndex, text);
  }, [exerciseId, setIndex, entryIndex, updateEntryTempo]);

  const handleRemoveEntry = useCallback(() => {
    removeSetEntry(exerciseId, setIndex, entryIndex);
  }, [exerciseId, setIndex, entryIndex, removeSetEntry]);

  return (
    <View style={styles.entryContainer}>
      {showEntryHeader ? (
        <View style={styles.entryHeader}>
          <Text style={styles.entryLabel}>種目 {entryIndex + 1}</Text>
          <IconButton
            icon="close-circle-outline"
            iconColor={darkTheme.colors.onSurfaceVariant}
            size={16}
            onPress={handleRemoveEntry}
          />
        </View>
      ) : null}

      <View style={styles.compactRow}>
        <TextInput
          mode="outlined"
          label="回数"
          accessibilityLabel="回数"
          value={reps > 0 ? reps.toString() : ''}
          onChangeText={handleRepsChange}
          placeholder="0"
          keyboardType="number-pad"
          style={styles.compactInput}
          outlineColor={darkTheme.colors.outline}
          activeOutlineColor={exerciseColor}
          dense
        />
        <TextInput
          mode="outlined"
          label="重量 (kg)"
          accessibilityLabel="重量 (kg)"
          value={weight ? weight.toString() : ''}
          onChangeText={handleWeightChange}
          placeholder="kg"
          keyboardType="decimal-pad"
          style={styles.compactInput}
          outlineColor={darkTheme.colors.outline}
          activeOutlineColor={exerciseColor}
          dense
        />
      </View>

      <Button
        mode="text"
        onPress={toggleDetail}
        compact
        textColor={darkTheme.colors.onSurfaceVariant}
        style={styles.detailToggle}
        icon={isOpen ? 'chevron-up' : 'chevron-down'}
      >
        バリエーション・テンポ
      </Button>

      {isOpen ? (
        <View style={styles.detailBlock}>
          <View style={styles.setRow}>
            <IMESafeTextInput
              label="バリエーション"
              value={variation || ''}
              onSave={handleVariationSave}
              placeholder="例: ナロー"
              style={styles.variationInput}
              outlineColor={darkTheme.colors.outline}
              activeOutlineColor={exerciseColor}
            />
          </View>
          <View style={styles.setRow}>
            <IMESafeTextInput
              label="テンポ"
              value={tempo || ''}
              onSave={handleTempoSave}
              placeholder="例: 2-1-2"
              style={styles.tempoInput}
              outlineColor={darkTheme.colors.outline}
              activeOutlineColor={exerciseColor}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
});

// --- ExerciseCard コンポーネント ---
interface ExerciseCardProps {
  exercise: Exercise;
  exerciseColor: string;
  exerciseIcon: string;
  isDuration: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  reordering: boolean;
  position: number;
  totalExercises: number;
  onMove: (id: string, direction: -1 | 1) => void;
}

const ExerciseCard = memo<ExerciseCardProps>(({ exercise, exerciseColor, exerciseIcon, isDuration, expanded, onToggle, reordering, position, totalExercises, onMove }) => {
  const removeExercise = useWorkoutStore((s) => s.removeExercise);
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const copySet = useWorkoutStore((s) => s.copySet);
  const addSetEntry = useWorkoutStore((s) => s.addSetEntry);
  const updateDurationMinutes = useWorkoutStore((s) => s.updateDurationMinutes);
  const toggleSetCompleted = useWorkoutStore((s) => s.toggleSetCompleted);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const handleRemove = useCallback(() => removeExercise(exercise.id), [exercise.id, removeExercise]);
  const handleAddSet = useCallback(() => addSet(exercise.id), [exercise.id, addSet]);

  const cardStyle = useMemo(
    () => [styles.exerciseCard, { borderLeftColor: exerciseColor }],
    [exerciseColor]
  );

  const completed = exercise.sets.filter((set) => set.completed).length;
  const totalReps = exercise.sets.reduce((sum, set) => sum + set.entries.reduce((count, entry) => count + entry.reps, 0), 0);

  return (
    <Card style={cardStyle}>
      <View style={styles.exerciseOverview}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}の詳細${expanded ? 'を閉じる' : 'を開く'}`} accessibilityState={{ expanded }} onPress={() => onToggle(exercise.id)} style={({ pressed }) => [styles.exerciseOverviewButton, pressed && styles.pressed]}>
          <MaterialCommunityIcons name={exerciseIcon as any} size={26} color={exerciseColor} />
          <View style={styles.exerciseOverviewText}>
            <Text style={styles.exerciseTitle}>{exercise.name}</Text>
            <Text style={styles.exerciseSummary}>{isDuration ? (exercise.durationMinutes ? `${exercise.durationMinutes}分` : '時間を設定') : `${exercise.sets.length}セット · ${totalReps}回 · ${completed}/${exercise.sets.length}完了`}</Text>
          </View>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={darkTheme.colors.onSurfaceVariant} />
        </Pressable>
        <IconButton icon="delete-outline" accessibilityLabel={`${exercise.name}を削除`} iconColor={darkTheme.colors.onSurfaceVariant} onPress={() => setDeleteVisible(true)} size={20} />
      </View>
      {reordering ? (
        <View style={styles.reorderActions}>
          <Text style={styles.reorderPosition}>{position + 1} / {totalExercises}</Text>
          <Button compact icon="arrow-up" contentStyle={styles.reorderButtonContent} disabled={position === 0} accessibilityLabel={`${exercise.name}を上へ移動`} onPress={() => onMove(exercise.id, -1)}>上へ</Button>
          <Button compact icon="arrow-down" contentStyle={styles.reorderButtonContent} disabled={position === totalExercises - 1} accessibilityLabel={`${exercise.name}を下へ移動`} onPress={() => onMove(exercise.id, 1)}>下へ</Button>
        </View>
      ) : null}
      {expanded ? <Card.Content>
        {isDuration ? (
          <View style={styles.durationContainer}>
            <View style={styles.durationButtons}>
              {DURATION_PRESETS.map((mins) => (
                <Button
                  key={mins}
                  mode={exercise.durationMinutes === mins ? 'contained' : 'outlined'}
                  onPress={() => updateDurationMinutes(exercise.id, mins)}
                  style={styles.durationChip}
                  buttonColor={exercise.durationMinutes === mins ? exerciseColor : undefined}
                  compact
                >
                  {mins}分
                </Button>
              ))}
            </View>
          </View>
        ) : (
          <>
            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={[styles.setContainer, set.completed && styles.completedSet]}>
                <View style={styles.setHeader}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${exercise.name} セット ${setIndex + 1} 完了`}
                    accessibilityState={{ checked: set.completed }}
                    onPress={() => toggleSetCompleted(exercise.id, setIndex)}
                    style={({ pressed }) => [styles.completeButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name={set.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={24} color={set.completed ? darkTheme.colors.primary : darkTheme.colors.onSurfaceVariant} />
                    <Text style={[styles.setLabel, set.completed && { color: darkTheme.colors.primary }]}>
                      {setIndex + 1}セット目{set.completed ? '・完了' : ''}
                    </Text>
                  </Pressable>
                  <View style={styles.setActions}>
                    <IconButton
                      icon="content-copy"
                      accessibilityLabel={`${setIndex + 1}セット目をコピー`}
                      iconColor={darkTheme.colors.onSurfaceVariant}
                      size={18}
                      onPress={() => copySet(exercise.id, setIndex)}
                    />
                    <IconButton
                      icon="close"
                      accessibilityLabel={`${setIndex + 1}セット目を削除`}
                      iconColor={darkTheme.colors.error}
                      size={18}
                      onPress={() => removeSet(exercise.id, setIndex)}
                    />
                  </View>
                </View>

                {set.entries.map((entry, entryIndex) => (
                  <SetEntryRow
                    key={entryIndex}
                    exerciseId={exercise.id}
                    exerciseType={exercise.type}
                    setIndex={setIndex}
                    entryIndex={entryIndex}
                    reps={entry.reps}
                    weight={entry.weight}
                    variation={entry.variation}
                    tempo={entry.tempo}
                    showEntryHeader={set.entries.length > 1}
                    exerciseColor={exerciseColor}
                  />
                ))}

                <Button
                  mode="text"
                  icon="plus"
                  onPress={() => addSetEntry(exercise.id, setIndex)}
                  textColor={darkTheme.colors.onSurfaceVariant}
                  compact
                  style={styles.addEntryButton}
                >
                  セット内追加
                </Button>
              </View>
            ))}
            <Button
              mode="text"
              icon="plus"
              onPress={handleAddSet}
              textColor={darkTheme.colors.primary}
            >
              セット追加
            </Button>
          </>
        )}
      </Card.Content> : null}
      <Portal>
        <Dialog visible={deleteVisible} onDismiss={() => setDeleteVisible(false)} style={styles.dialog}>
          <Dialog.Title>種目を削除しますか？</Dialog.Title>
          <Dialog.Content><Text>「{exercise.name}」と、この種目のセット記録を削除します。</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteVisible(false)}>キャンセル</Button>
            <Button textColor={darkTheme.colors.error} onPress={handleRemove}>削除する</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
});

// --- ExerciseSelectDialog コンポーネント ---
interface ExerciseSelectDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenCustomDialog: (name?: string) => void;
  onAdded: (id: string) => void;
}

const ExerciseSelectDialog = memo<ExerciseSelectDialogProps>(({ visible, onDismiss, onOpenCustomDialog, onAdded }) => {
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const workouts = useWorkoutStore((s) => s.workouts);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const hiddenBuiltinExercises = useWorkoutStore((s) => s.hiddenBuiltinExercises);
  const exercisePickerOrder = useWorkoutStore((s) => s.exercisePickerOrder);
  const exercisePickerSort = useWorkoutStore((s) => s.exercisePickerSort);
  const setExercisePickerOrder = useWorkoutStore((s) => s.setExercisePickerOrder);
  const setExercisePickerSort = useWorkoutStore((s) => s.setExercisePickerSort);
  const hideBuiltinExercise = useWorkoutStore((s) => s.hideBuiltinExercise);
  const showBuiltinExercise = useWorkoutStore((s) => s.showBuiltinExercise);
  const removeCustomExercise = useWorkoutStore((s) => s.removeCustomExercise);

  const [query, setQuery] = useState('');
  const [reordering, setReordering] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (name: string) => name.toLocaleLowerCase().includes(normalizedQuery);
  useEffect(() => { if (visible) { setQuery(''); setReordering(false); } }, [visible]);

  const allBuiltinExerciseTypes: BuiltinExerciseType[] = ['pushup', 'squat', 'pullup', 'bodypump', 'bodycombat', 'leapfight', 'swimming'];
  const exerciseTypes = useMemo<ExerciseType[]>(() => [
    ...allBuiltinExerciseTypes.filter((type) => !hiddenBuiltinExercises.includes(type)),
    ...customExercises.map((exercise) => exercise.id),
  ], [hiddenBuiltinExercises, customExercises]);
  const usageCounts = useMemo(() => countExerciseDays(workouts), [workouts]);
  const orderedExerciseTypes = useMemo(
    () => sortExerciseTypes(exerciseTypes, usageCounts, exercisePickerOrder, exercisePickerSort),
    [exerciseTypes, usageCounts, exercisePickerOrder, exercisePickerSort]
  );
  const visibleExerciseTypes = orderedExerciseTypes.filter((type) => {
    const name = BUILTIN_EXERCISE_NAMES[type as BuiltinExerciseType]
      || customExercises.find((exercise) => exercise.id === type)?.name || type;
    return matches(name);
  });

  const handleToggleReordering = useCallback(() => {
    if (reordering) {
      setReordering(false);
      return;
    }
    setQuery('');
    setExercisePickerOrder([...orderedExerciseTypes, ...exercisePickerOrder.filter((type) => !orderedExerciseTypes.includes(type))]);
    setReordering(true);
  }, [reordering, orderedExerciseTypes, exercisePickerOrder, setExercisePickerOrder]);
  const handleMoveExercise = useCallback((type: ExerciseType, direction: -1 | 1) => {
    const reordered = moveExerciseType(orderedExerciseTypes, type, direction);
    if (reordered === orderedExerciseTypes) return;
    setExercisePickerOrder([...reordered, ...exercisePickerOrder.filter((item) => !reordered.includes(item))]);
  }, [orderedExerciseTypes, exercisePickerOrder, setExercisePickerOrder]);

  const handleAddExercise = useCallback((type: ExerciseType) => {
    const id = addExercise(type);
    onDismiss();
    onAdded(id);
  }, [addExercise, onDismiss, onAdded]);

  const handleOpenCustom = useCallback(() => {
    onDismiss();
    onOpenCustomDialog(query.trim());
  }, [onDismiss, onOpenCustomDialog, query]);

  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, styles.exercisePickerDialog]}>
      <Dialog.Title>トレーニングを追加</Dialog.Title>
      <Dialog.Content style={styles.exercisePickerContent}>
        <TextInput mode="outlined" label="種目を検索" accessibilityLabel="種目を検索" value={query} onChangeText={setQuery} editable={!reordering} left={<TextInput.Icon icon="magnify" />} style={styles.searchInput} />
        <Button mode="contained-tonal" icon="plus" onPress={handleOpenCustom} style={styles.createExerciseButton}>新しい種目を作成</Button>
        <View style={styles.exercisePickerToolbar}>
          <Button compact mode={exercisePickerSort === 'frequency' ? 'contained-tonal' : 'text'} icon="sort-descending" onPress={() => { setExercisePickerSort('frequency'); setReordering(false); }} style={styles.exercisePickerToolbarButton}>よく使う順</Button>
          <Button compact mode={exercisePickerSort === 'custom' ? 'contained-tonal' : 'text'} icon={reordering ? 'check' : 'swap-vertical'} onPress={handleToggleReordering} style={styles.exercisePickerToolbarButton}>{reordering ? '完了' : '並べ替え'}</Button>
        </View>
        <Text style={styles.exercisePickerHint}>{reordering ? '矢印で順番を変更できます' : exercisePickerSort === 'frequency' ? '記録した日が多い種目から表示します' : '並び順は自動で保存されます'}</Text>
        <ScrollView style={styles.exerciseList} keyboardShouldPersistTaps="handled">
          {visibleExerciseTypes.length === 0 ? <Text style={styles.emptyTemplateText}>該当する種目がありません。{'\n'}上のボタンから新しく作成できます。</Text> : null}
          {visibleExerciseTypes.map((type, index) => {
            const custom = customExercises.find((exercise) => exercise.id === type);
            const name = BUILTIN_EXERCISE_NAMES[type as BuiltinExerciseType] || custom?.name || type;
            const color = getExerciseColor(type, customExercises);
            const icon = getExerciseIcon(type, customExercises);
            if (reordering) return (
              <View key={type} style={[styles.exercisePickerReorderRow, { borderColor: color }]}>
                <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                <Text style={[styles.exercisePickerReorderName, { color }]} numberOfLines={1}>{name}</Text>
                <IconButton icon="arrow-up" size={20} disabled={index === 0} accessibilityLabel={`${name}を上へ移動`} onPress={() => handleMoveExercise(type, -1)} />
                <IconButton icon="arrow-down" size={20} disabled={index === visibleExerciseTypes.length - 1} accessibilityLabel={`${name}を下へ移動`} onPress={() => handleMoveExercise(type, 1)} />
              </View>
            );
            return (
              <Swipeable
                key={type}
                renderRightActions={() => (
                  <Pressable style={styles.swipeDeleteAction} onPress={() => {
                    if (!custom) { hideBuiltinExercise(type); return; }
                    Alert.alert('カスタム種目の削除', `「${custom.name}」を削除しますか？`, [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '削除', style: 'destructive', onPress: () => removeCustomExercise(custom.id) },
                    ]);
                  }}>
                    <MaterialCommunityIcons name="delete-outline" size={22} color="white" />
                  </Pressable>
                )}
                overshootRight={false}
              >
                <Button
                  mode="outlined"
                  onPress={() => handleAddExercise(type)}
                  style={[styles.exerciseButton, { borderColor: color }]}
                  labelStyle={{ color }}
                  icon={() => <MaterialCommunityIcons name={icon as any} size={20} color={color} />}
                  contentStyle={styles.exerciseButtonContent}
                >
                  {name}
                </Button>
              </Swipeable>
            );
          })}
          {!reordering && !normalizedQuery && hiddenBuiltinExercises.length > 0 ? (
            <View style={styles.hiddenExercisesSection}>
              <Text style={styles.hiddenExercisesLabel}>非表示の種目</Text>
              {hiddenBuiltinExercises.map((type) => (
                <Button
                  key={type}
                  mode="outlined"
                  onPress={() => showBuiltinExercise(type)}
                  style={styles.hiddenExerciseButton}
                  icon="eye-outline"
                >
                  {BUILTIN_EXERCISE_NAMES[type as keyof typeof BUILTIN_EXERCISE_NAMES] || type}
                </Button>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>閉じる</Button>
      </Dialog.Actions>
    </Dialog>
  );
});

// --- CustomExerciseDialog コンポーネント ---
interface CustomExerciseDialogProps {
  visible: boolean;
  onDismiss: () => void;
  initialName: string;
  onAdded: (id: string) => void;
}

const ICON_OPTIONS = ['dumbbell', 'arm-flex', 'human', 'human-handsup', 'run', 'boxing-glove', 'karate', 'swim', 'weight-lifter', 'yoga', 'bike'];
const COLOR_OPTIONS = ['#3b82f6', '#22c55e', '#f59e0b', '#f472b6', '#a855f7', '#ef4444', '#f97316', darkTheme.colors.primary, '#ec4899', '#06b6d4'];

const CustomExerciseDialog = memo<CustomExerciseDialogProps>(({ visible, onDismiss, initialName, onAdded }) => {
  const addExercise = useWorkoutStore((state) => state.addExercise);
  const selectedDate = useWorkoutStore((state) => state.selectedDate);
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);
  const [customExerciseIcon, setCustomExerciseIcon] = useState('dumbbell');
  const [customExerciseColor, setCustomExerciseColor] = useState('#3b82f6');
  const [customExerciseIsDuration, setCustomExerciseIsDuration] = useState(false);
  const [customExerciseNameEmpty, setCustomExerciseNameEmpty] = useState(true);
  const customExerciseNameRef = useRef('');
  const [showAppearance, setShowAppearance] = useState(false);
  useEffect(() => {
    if (!visible) return;
    customExerciseNameRef.current = initialName;
    setCustomExerciseNameEmpty(!initialName.trim());
    setShowAppearance(false);
  }, [visible, initialName]);

  const handleAdd = useCallback(() => {
    const name = customExerciseNameRef.current.trim();
    if (!name) return;
    const customId = addCustomExercise({
      name,
      icon: customExerciseIcon,
      color: customExerciseColor,
      hasWeight: true,
      isDuration: customExerciseIsDuration,
    });
    const exerciseId = addExercise(customId);
    onAdded(exerciseId);
    customExerciseNameRef.current = '';
    setCustomExerciseNameEmpty(true);
    setCustomExerciseIcon('dumbbell');
    setCustomExerciseColor('#3b82f6');
    setCustomExerciseIsDuration(false);
    onDismiss();
  }, [customExerciseIcon, customExerciseColor, customExerciseIsDuration, addCustomExercise, addExercise, onAdded, onDismiss]);

  const handleNameChange = useCallback((text: string) => {
    customExerciseNameRef.current = text;
    const isEmpty = !text.trim();
    setCustomExerciseNameEmpty((prev) => (prev !== isEmpty ? isEmpty : prev));
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onDismiss}>
      <SafeAreaProvider>
      <KeyboardAvoidingView style={styles.customExerciseScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.customExerciseScreen}>
          <View style={styles.customExerciseHeader}>
            <Text style={styles.customExerciseTitle}>新しい種目を作成</Text>
            <IconButton icon="close" accessibilityLabel="種目の作成を閉じる" onPress={onDismiss} />
          </View>
          <ScrollView
            style={styles.customExerciseForm}
            contentContainerStyle={styles.customExerciseFormContent}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
        <Text style={styles.helpText}>{selectedDate.replaceAll('-', '/')}のメニューに追加します</Text>
        <Text style={styles.customExerciseLabel}>種目名</Text>
        <RNTextInput
          key={`${visible}-${initialName}`}
          accessibilityLabel="新しい種目名"
          defaultValue={initialName}
          onChangeText={handleNameChange}
          placeholder="例: ベンチプレス"
          placeholderTextColor={darkTheme.colors.onSurfaceVariant}
          style={styles.customExerciseNativeInput}
          autoFocus={true}
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Button mode="text" icon={showAppearance ? 'chevron-up' : 'palette-outline'} onPress={() => setShowAppearance((value) => !value)}>アイコン・色を変更</Button>
        {showAppearance ? <>
        <Text style={styles.customExerciseLabel}>アイコン</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
          {ICON_OPTIONS.map((icon) => (
            <IconButton
              key={icon}
              icon={icon}
              iconColor={customExerciseIcon === icon ? darkTheme.colors.primary : darkTheme.colors.onSurfaceVariant}
              containerColor={customExerciseIcon === icon ? darkTheme.colors.primaryContainer : 'transparent'}
              onPress={() => setCustomExerciseIcon(icon)}
              size={24}
            />
          ))}
        </ScrollView>
        <Text style={styles.customExerciseLabel}>カラー</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
          {COLOR_OPTIONS.map((color) => (
            <IconButton
              key={color}
              icon={customExerciseColor === color ? 'check' : 'circle'}
              iconColor={color}
              containerColor={customExerciseColor === color ? `${color}20` : 'transparent'}
              onPress={() => setCustomExerciseColor(color)}
              size={24}
            />
          ))}
        </ScrollView>
        </> : null}
        <View style={styles.customExerciseSwitchRow}>
          <View style={styles.customExerciseSwitchText}>
            <Text style={styles.customExerciseSwitchTitle}>時間で記録</Text>
            <Text style={styles.customExerciseSwitchDescription}>30/45/60分の選択で記録します</Text>
          </View>
          <Switch
            value={customExerciseIsDuration}
            onValueChange={setCustomExerciseIsDuration}
            color={darkTheme.colors.primary}
          />
        </View>
          </ScrollView>
          <View style={styles.customExerciseActions}>
            <Button onPress={onDismiss}>キャンセル</Button>
            <Button mode="contained" onPress={handleAdd} disabled={customExerciseNameEmpty}>作成して追加</Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      </SafeAreaProvider>
    </Modal>
  );
});

// --- TemplateDialog コンポーネント ---
interface TemplateDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onStartEditing?: (info: { id: string; name: string }) => void;
}

const TemplateSelectDialog = memo<TemplateDialogProps>(({ visible, onDismiss }) => {
  const templates = useWorkoutStore((s) => s.templates);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const applyTemplate = useWorkoutStore((s) => s.applyTemplate);
  const deleteTemplate = useWorkoutStore((s) => s.deleteTemplate);
  const renameTemplate = useWorkoutStore((s) => s.renameTemplate);
  const saveTemplate = useWorkoutStore((s) => s.saveTemplate);
  const addExerciseToTemplate = useWorkoutStore((s) => s.addExerciseToTemplate);
  const removeExerciseFromTemplate = useWorkoutStore((s) => s.removeExerciseFromTemplate);
  const moveExerciseInTemplate = useWorkoutStore((s) => s.moveExerciseInTemplate);
  const updateTemplateEntryReps = useWorkoutStore((s) => s.updateTemplateEntryReps);
  const updateTemplateEntryWeight = useWorkoutStore((s) => s.updateTemplateEntryWeight);
  const updateTemplateEntryVariation = useWorkoutStore((s) => s.updateTemplateEntryVariation);
  const updateTemplateEntryTempo = useWorkoutStore((s) => s.updateTemplateEntryTempo);
  const addTemplateSet = useWorkoutStore((s) => s.addTemplateSet);
  const removeTemplateSet = useWorkoutStore((s) => s.removeTemplateSet);
  const addTemplateSetEntry = useWorkoutStore((s) => s.addTemplateSetEntry);
  const removeTemplateSetEntry = useWorkoutStore((s) => s.removeTemplateSetEntry);
  const hiddenBuiltinExercises = useWorkoutStore((s) => s.hiddenBuiltinExercises);
  const hasExercises = useWorkoutStore((s) => (s.workouts.find((w) => w.date === s.selectedDate)?.exercises.length ?? 0) > 0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showSaveNew, setShowSaveNew] = useState(false);
  const [saveNameEmpty, setSaveNameEmpty] = useState(true);
  const renameRef = useRef('');
  const saveNameRef = useRef('');

  const allBuiltinTypes: BuiltinExerciseType[] = ['pushup', 'squat', 'pullup', 'bodypump', 'bodycombat', 'leapfight', 'swimming'];
  const availableTypes = useMemo(
    () => allBuiltinTypes.filter((t) => !hiddenBuiltinExercises.includes(t)),
    [hiddenBuiltinExercises]
  );

  const editingTemplate = useMemo(
    () => templates.find((t) => t.id === editingId),
    [templates, editingId]
  );

  const handleApply = useCallback((id: string) => {
    applyTemplate(id);
    onDismiss();
  }, [applyTemplate, onDismiss]);

  const handleStartRename = useCallback((id: string, currentName: string) => {
    renameRef.current = currentName;
    setRenameId(id);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (renameId && renameRef.current.trim()) {
      renameTemplate(renameId, renameRef.current.trim());
    }
    setRenameId(null);
  }, [renameId, renameTemplate]);

  const handleBack = useCallback(() => {
    setEditingId(null);
    setShowAddExercise(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setEditingId(null);
    setShowAddExercise(false);
    setRenameId(null);
    setShowSaveNew(false);
    saveNameRef.current = '';
    setSaveNameEmpty(true);
    onDismiss();
  }, [onDismiss]);

  const handleSaveNew = useCallback(() => {
    const name = saveNameRef.current.trim();
    if (name) {
      saveTemplate(name);
      saveNameRef.current = '';
      setSaveNameEmpty(true);
      setShowSaveNew(false);
    }
  }, [saveTemplate]);

  const handleSaveNameChange = useCallback((text: string) => {
    saveNameRef.current = text;
    const isEmpty = !text.trim();
    setSaveNameEmpty((prev) => (prev !== isEmpty ? isEmpty : prev));
  }, []);

  // 編集モード
  if (editingId && editingTemplate) {
    return (
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>「{editingTemplate.name}」を編集</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.templateEditList}>
            {editingTemplate.exercises.map((exercise, index) => {
              const color = getExerciseColor(exercise.type, customExercises);
              const icon = getExerciseIcon(exercise.type, customExercises);
              return (
                <View key={exercise.id} style={[styles.templateExerciseCard, { borderLeftColor: color }]}>
                  <View style={styles.templateEditItem}>
                    <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                    <Text style={[styles.templateExerciseName, { color }]}>{exercise.name}</Text>
                    <IconButton
                      icon="close-circle-outline"
                      size={18}
                      iconColor={darkTheme.colors.error}
                      onPress={() => removeExerciseFromTemplate(editingId, exercise.id)}
                    />
                  </View>
                  {editingTemplate.exercises.length > 1 ? (
                    <View style={styles.templateReorderRow}>
                      <Text style={styles.reorderPosition}>{index + 1} / {editingTemplate.exercises.length}</Text>
                      <Button compact icon="arrow-up" contentStyle={styles.reorderButtonContent} disabled={index === 0} accessibilityLabel={`${exercise.name}を上へ移動`} onPress={() => moveExerciseInTemplate(editingId, exercise.id, -1)}>上へ</Button>
                      <Button compact icon="arrow-down" contentStyle={styles.reorderButtonContent} disabled={index === editingTemplate.exercises.length - 1} accessibilityLabel={`${exercise.name}を下へ移動`} onPress={() => moveExerciseInTemplate(editingId, exercise.id, 1)}>下へ</Button>
                    </View>
                  ) : null}
                  {exercise.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.templateSetBlock}>
                      <View style={styles.templateSetHeader}>
                        <Text style={styles.templateSetLabel}>セット {setIndex + 1}</Text>
                        <IconButton
                          icon="close"
                          size={16}
                          iconColor={darkTheme.colors.onSurfaceVariant}
                          onPress={() => removeTemplateSet(editingId, exercise.id, setIndex)}
                        />
                      </View>
                      {set.entries.map((entry, entryIndex) => (
                        <View key={entryIndex} style={styles.templateEntryBlock}>
                          {set.entries.length > 1 ? (
                            <View style={styles.templateEntryHeader}>
                              <Text style={styles.templateEntryLabel}>種目 {entryIndex + 1}</Text>
                              <IconButton
                                icon="close-circle-outline"
                                size={14}
                                iconColor={darkTheme.colors.onSurfaceVariant}
                                onPress={() => removeTemplateSetEntry(editingId, exercise.id, setIndex, entryIndex)}
                              />
                            </View>
                          ) : null}
                          <View style={styles.templateEntryRow}>
                            <TextInput
                              mode="outlined"
                              label="回数"
                              value={entry.reps > 0 ? entry.reps.toString() : ''}
                              onChangeText={(text) => updateTemplateEntryReps(editingId, exercise.id, setIndex, entryIndex, parseInt(text, 10) || 0)}
                              keyboardType="number-pad"
                              style={styles.templateInput}
                              outlineColor={darkTheme.colors.outline}
                              activeOutlineColor={color}
                              dense
                            />
                            <TextInput
                              mode="outlined"
                              label="kg"
                              value={entry.weight ? entry.weight.toString() : ''}
                              onChangeText={(text) => {
                                const w = parseFloat(text);
                                updateTemplateEntryWeight(editingId, exercise.id, setIndex, entryIndex, Number.isFinite(w) ? w : 0);
                              }}
                              keyboardType="decimal-pad"
                              style={styles.templateInput}
                              outlineColor={darkTheme.colors.outline}
                              activeOutlineColor={color}
                              dense
                            />
                          </View>
                          <View style={styles.templateDetailRow}>
                            <TextInput
                              mode="outlined"
                              label="バリエーション"
                              value={entry.variation || ''}
                              onChangeText={(text) => updateTemplateEntryVariation(editingId, exercise.id, setIndex, entryIndex, text)}
                              placeholder="例: ナロー"
                              style={styles.templateDetailInput}
                              outlineColor={darkTheme.colors.outline}
                              activeOutlineColor={color}
                              dense
                            />
                            <TextInput
                              mode="outlined"
                              label="テンポ"
                              value={entry.tempo || ''}
                              onChangeText={(text) => updateTemplateEntryTempo(editingId, exercise.id, setIndex, entryIndex, text)}
                              placeholder="例: 2-1-2"
                              style={styles.templateDetailInput}
                              outlineColor={darkTheme.colors.outline}
                              activeOutlineColor={color}
                              dense
                            />
                          </View>
                        </View>
                      ))}
                      <Button
                        mode="text"
                        icon="plus"
                        onPress={() => addTemplateSetEntry(editingId, exercise.id, setIndex)}
                        textColor={darkTheme.colors.onSurfaceVariant}
                        compact
                        style={styles.templateAddEntryButton}
                      >
                        セット内追加
                      </Button>
                    </View>
                  ))}
                  <Button
                    mode="text"
                    icon="plus"
                    onPress={() => addTemplateSet(editingId, exercise.id)}
                    textColor={darkTheme.colors.primary}
                    compact
                    style={styles.templateAddSetButton}
                  >
                    セット追加
                  </Button>
                </View>
              );
            })}
            {editingTemplate.exercises.length === 0 ? (
              <Text style={styles.emptyTemplateText}>種目がありません</Text>
            ) : null}

            {showAddExercise ? (
              <View style={styles.addExerciseSection}>
                <Text style={styles.addExerciseSectionLabel}>種目を追加</Text>
                {availableTypes.map((type) => {
                  const color = getExerciseColor(type, customExercises);
                  const icon = getExerciseIcon(type, customExercises);
                  return (
                    <Button
                      key={type}
                      mode="outlined"
                      onPress={() => { addExerciseToTemplate(editingId, type); setShowAddExercise(false); }}
                      style={[styles.exerciseButton, { borderColor: color }]}
                      labelStyle={{ color }}
                      icon={() => <MaterialCommunityIcons name={icon as any} size={18} color={color} />}
                      contentStyle={styles.exerciseButtonContent}
                      compact
                    >
                      {BUILTIN_EXERCISE_NAMES[type]}
                    </Button>
                  );
                })}
                {customExercises.map((custom) => (
                  <Button
                    key={custom.id}
                    mode="outlined"
                    onPress={() => { addExerciseToTemplate(editingId, custom.id); setShowAddExercise(false); }}
                    style={[styles.exerciseButton, { borderColor: custom.color }]}
                    labelStyle={{ color: custom.color }}
                    icon={() => <MaterialCommunityIcons name={custom.icon as any} size={18} color={custom.color} />}
                    contentStyle={styles.exerciseButtonContent}
                    compact
                  >
                    {custom.name}
                  </Button>
                ))}
              </View>
            ) : (
              <Button
                mode="text"
                icon="plus"
                onPress={() => setShowAddExercise(true)}
                textColor={darkTheme.colors.primary}
                style={styles.addExerciseButton}
              >
                種目を追加
              </Button>
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleBack}>戻る</Button>
        </Dialog.Actions>
      </Dialog>
    );
  }

  // 一覧モード: 内容を確認してから、その日の記録に追加する。
  return (
    <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
      <Dialog.Title>保存メニュー</Dialog.Title>
      <Dialog.Content>
        <Text style={styles.helpText}>種目の組み合わせを保存して、別の日にも使えます。</Text>
        {hasExercises ? (
          <View style={styles.saveMenuArea}>
            {showSaveNew ? (
              <>
                <RNTextInput accessibilityLabel="保存するメニュー名" defaultValue="" onChangeText={handleSaveNameChange} placeholder="メニュー名（例: 胸の日）" placeholderTextColor={darkTheme.colors.onSurfaceVariant} style={styles.textInput} autoFocus onSubmitEditing={handleSaveNew} />
                <View style={styles.templateActions}>
                  <Button onPress={() => setShowSaveNew(false)}>キャンセル</Button>
                  <Button mode="contained" onPress={handleSaveNew} disabled={saveNameEmpty}>保存する</Button>
                </View>
              </>
            ) : <Button mode="contained" icon="content-save-plus" onPress={() => setShowSaveNew(true)}>この日の内容を保存</Button>}
          </View>
        ) : null}
        <ScrollView style={styles.templateList} keyboardShouldPersistTaps="handled">
          {templates.length === 0 ? (
            <Text style={styles.emptyTemplateText}>保存メニューはまだありません。{'\n'}トレーニングに種目を追加すると、{'\n'}ここから組み合わせを保存できます。</Text>
          ) : templates.map((template) => (
            <View key={template.id} style={styles.templatePreview}>
              {renameId === template.id ? (
                <View style={styles.renameRow}>
                  <RNTextInput accessibilityLabel="メニュー名を変更" defaultValue={template.name} onChangeText={(text) => { renameRef.current = text; }} style={[styles.textInput, styles.renameInput]} autoFocus onSubmitEditing={handleConfirmRename} />
                  <IconButton icon="check" accessibilityLabel="名前の変更を保存" onPress={handleConfirmRename} />
                </View>
              ) : <Text style={styles.templateName}>{template.name}</Text>}
              <Text style={styles.templateDescription}>{template.exercises.length}種目 · {template.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)}セット</Text>
              {template.exercises.map((exercise) => (
                <Text key={exercise.id} style={styles.templateDescription}>・{exercise.name}{exercise.durationMinutes ? ` / ${exercise.durationMinutes}分` : ` / ${exercise.sets.length}セット`}</Text>
              ))}
              <View style={styles.templateActions}>
                <Button mode="contained-tonal" icon="plus" compact disabled={template.exercises.length === 0} accessibilityLabel={`${template.name}を記録に追加`} onPress={() => handleApply(template.id)}>追加する</Button>
                <Button compact accessibilityLabel={`${template.name}の内容を編集`} onPress={() => setEditingId(template.id)}>内容を編集</Button>
              </View>
              <View style={styles.templateActions}>
                <Button compact icon="pencil-outline" textColor={darkTheme.colors.onSurfaceVariant} onPress={() => handleStartRename(template.id, template.name)}>名前を変更</Button>
                <IconButton icon="delete-outline" accessibilityLabel={`${template.name}を削除`} size={20} iconColor={darkTheme.colors.onSurfaceVariant} onPress={() => Alert.alert('メニューの削除', `「${template.name}」を削除しますか？`, [{ text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => deleteTemplate(template.id) }])} />
              </View>
            </View>
          ))}
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions><Button onPress={handleDismiss}>閉じる</Button></Dialog.Actions>
    </Dialog>
  );
});


// --- メインHomeScreen ---

export default function HomeScreen() {
  const {
    selectedDate,
    setSelectedDate,
    workoutTimerRunning,
    customExercises,
    startWorkoutTimer,
    stopWorkoutTimer,
    resetWorkoutTimer,
    getWorkoutByDate,
    getSelectedWorkoutDurationSeconds,
  } = useWorkoutStore();

  const selectedWorkout = getWorkoutByDate(selectedDate);
  const exercises = selectedWorkout?.exercises ?? EMPTY_EXERCISES;

  // Dialog visibility states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [customExerciseDialogVisible, setCustomExerciseDialogVisible] = useState(false);
  const [templateDialogVisible, setTemplateDialogVisible] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const moveExercise = useWorkoutStore((state) => state.moveExercise);
  const listRef = useRef<FlashListRef<Exercise>>(null);
  const addedExerciseToScrollTo = useRef<string | null>(null);
  const handleToggleExercise = useCallback((id: string) => setExpandedExerciseId((current) => current === id ? null : id), []);
  const handleMoveExercise = useCallback((id: string, direction: -1 | 1) => moveExercise(id, direction), [moveExercise]);
  const handleToggleReordering = useCallback(() => {
    setReordering((current) => !current);
    setExpandedExerciseId(null);
  }, []);
  const handleExerciseAdded = useCallback((id: string) => {
    addedExerciseToScrollTo.current = id;
    setReordering(false);
    setExpandedExerciseId(id);
  }, []);
  useEffect(() => {
    addedExerciseToScrollTo.current = null;
    setExpandedExerciseId(null);
    setReordering(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [selectedDate]);
  useEffect(() => {
    const id = addedExerciseToScrollTo.current;
    if (!id) return;
    const index = exercises.findIndex((exercise) => exercise.id === id);
    if (index < 0) return;
    addedExerciseToScrollTo.current = null;
    const frame = requestAnimationFrame(() => { void listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 }); });
    return () => cancelAnimationFrame(frame);
  }, [exercises, expandedExerciseId]);

  // Timer tick for duration display
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    if (!workoutTimerRunning) return;
    const intervalId = setInterval(() => {
      setTimerTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [workoutTimerRunning]);

  const now = new Date();
  const isToday = selectedDate === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const workoutDurationSeconds = getSelectedWorkoutDurationSeconds();
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const completedSets = exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0);
  const durationMinutes = exercises.reduce((sum, exercise) => sum + (exercise.durationMinutes || 0), 0);

  // Stable callbacks
  const handleOpenDialog = useCallback(() => setDialogVisible(true), []);
  const handleCloseDialog = useCallback(() => setDialogVisible(false), []);
  const handleOpenCustomExerciseDialog = useCallback((name = '') => { setNewExerciseName(name); setCustomExerciseDialogVisible(true); }, []);
  const handleCloseCustomExerciseDialog = useCallback(() => setCustomExerciseDialogVisible(false), []);
  const handleOpenTemplateDialog = useCallback(() => setTemplateDialogVisible(true), []);
  const handleCloseTemplateDialog = useCallback(() => setTemplateDialogVisible(false), []);

  // FlashList renderItem
  const renderExerciseItem = useCallback(({ item }: { item: Exercise }) => {
    const color = getExerciseColor(item.type, customExercises);
    const icon = getExerciseIcon(item.type, customExercises);
    const isDuration = isExerciseDurationBased(item.type, customExercises);
    const position = exercises.findIndex((exercise) => exercise.id === item.id);
    return <ExerciseCard exercise={item} exerciseColor={color} exerciseIcon={icon} isDuration={isDuration} expanded={expandedExerciseId === item.id} onToggle={handleToggleExercise} reordering={reordering} position={position} totalExercises={exercises.length} onMove={handleMoveExercise} />;
  }, [customExercises, expandedExerciseId, handleToggleExercise, reordering, exercises, handleMoveExercise]);

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  const insets = useSafeAreaInsets();

  const header = (
    <View style={styles.headerSection}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.eyebrow}>SLOWREP / WORKOUT LOG</Text>
          <Text style={styles.screenTitle}>{isToday ? '今日のトレーニング' : 'トレーニング記録'}</Text>
        </View>
        <MaterialCommunityIcons name="dumbbell" size={26} color={darkTheme.colors.primary} />
      </View>
      <WorkoutCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

      <View style={styles.workoutTimerContainer}>
        <View style={styles.timerReadout}>
          <Text style={styles.durationText}>{workoutTimerRunning ? '● 計測中' : 'トレーニング時間'}</Text>
          <Text style={styles.timerDisplay}>{formatDuration(workoutDurationSeconds)}</Text>
        </View>
        <View style={styles.workoutTimerButtons}>
          <Button mode="contained" icon={workoutTimerRunning ? 'pause' : 'play'} onPress={workoutTimerRunning ? stopWorkoutTimer : startWorkoutTimer} contentStyle={styles.timerControl}>
            {workoutTimerRunning ? '一時停止' : workoutDurationSeconds > 0 ? '再開' : '計測開始'}
          </Button>
          {workoutDurationSeconds > 0 && !workoutTimerRunning ? (
            <Button compact textColor={darkTheme.colors.onSurfaceVariant} onPress={() => setResetDialogVisible(true)}>時間をリセット</Button>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>トレーニングメニュー</Text>
        <View style={styles.sectionHeadingActions}>
          <Text style={styles.sectionMeta}>{exercises.length}種目</Text>
          {exercises.length > 1 ? <Button compact icon={reordering ? 'check' : 'swap-vertical'} onPress={handleToggleReordering}>{reordering ? '完了' : '並べ替え'}</Button> : null}
        </View>
      </View>
      {exercises.length > 0 ? (
        <View style={styles.progressSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionMeta}>{totalSets > 0 ? `${completedSets} / ${totalSets} セット完了` : '時間で記録するメニュー'}</Text>
            {durationMinutes > 0 ? <Text style={styles.sectionMeta}>{durationMinutes}分</Text> : null}
          </View>
          {totalSets > 0 ? <ProgressBar accessibilityLabel="セットの完了状況" progress={completedSets / totalSets} color={darkTheme.colors.primary} style={styles.progressBar} /> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.screenBody}>
        <FlashList
          ref={listRef}
          extraData={`${expandedExerciseId ?? ''}:${reordering}:${exercises.map((exercise) => exercise.id).join(',')}`}
          maintainVisibleContentPosition={{ disabled: true }}
          data={exercises}
          renderItem={renderExerciseItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}><MaterialCommunityIcons name="dumbbell" size={36} color={darkTheme.colors.primary} /></View>
              <Text style={styles.emptyTitle}>最初の1種目から。</Text>
              <Text style={styles.emptyText}>種目を追加して、回数や重量を記録。{'\n'}いつものメニューからも始められます。</Text>
              <Button mode="text" icon="playlist-play" onPress={handleOpenTemplateDialog} style={styles.emptyMenuButton}>保存したメニューを選ぶ</Button>
            </View>
          }
        />
        <View style={styles.bottomButtons}>
          <Button mode="outlined" icon="playlist-play" onPress={handleOpenTemplateDialog} style={styles.menuButton} contentStyle={styles.primaryAction}>保存メニュー</Button>
          <Button mode="contained" icon="plus" onPress={handleOpenDialog} style={styles.addButtonFlex} contentStyle={styles.primaryAction}>種目を追加</Button>
        </View>
      </View>

      <Portal>
        <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>計測時間をリセットしますか？</Dialog.Title>
          <Dialog.Content><Text>表示中の日付のトレーニング時間を0に戻します。</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialogVisible(false)}>キャンセル</Button>
            <Button textColor={darkTheme.colors.error} onPress={() => { resetWorkoutTimer(); setResetDialogVisible(false); }}>リセットする</Button>
          </Dialog.Actions>
        </Dialog>
        <ExerciseSelectDialog
          visible={dialogVisible}
          onDismiss={handleCloseDialog}
          onOpenCustomDialog={handleOpenCustomExerciseDialog}
          onAdded={handleExerciseAdded}
        />
        <TemplateSelectDialog
          visible={templateDialogVisible}
          onDismiss={handleCloseTemplateDialog}
        />
      </Portal>
      <CustomExerciseDialog
        visible={customExerciseDialogVisible}
        onDismiss={handleCloseCustomExerciseDialog}
        initialName={newExerciseName}
        onAdded={handleExerciseAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  saveMenuArea: { marginBottom: 16 },
  templatePreview: { padding: 14, marginBottom: 12, borderRadius: 14, backgroundColor: darkTheme.colors.surfaceVariant },
  templateName: { fontSize: 17, fontWeight: '700', color: darkTheme.colors.onSurface, marginBottom: 6 },
  templateDescription: { fontSize: 13, lineHeight: 22, color: darkTheme.colors.onSurfaceVariant },
  templateActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 4 },
  exerciseOverview: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4 },
  exerciseOverviewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20 },
  exerciseOverviewText: { flex: 1 },
  reorderActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 12, paddingBottom: 8 },
  reorderButtonContent: { minHeight: 44 },
  reorderPosition: { color: darkTheme.colors.onSurfaceVariant, fontSize: 12, marginRight: 'auto' },
  templateReorderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  exerciseSummary: { color: darkTheme.colors.onSurfaceVariant, fontSize: 12, marginTop: 6, lineHeight: 18 },
  searchInput: { marginBottom: 12, backgroundColor: darkTheme.colors.surface },
  createExerciseButton: { marginBottom: 16 },
  exercisePickerToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  exercisePickerToolbarButton: { flex: 1, minWidth: 0 },
  exercisePickerHint: { color: darkTheme.colors.onSurfaceVariant, fontSize: 12, marginBottom: 12, paddingHorizontal: 4 },
  exercisePickerReorderRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, borderWidth: 1, borderRadius: 16, marginHorizontal: 16, marginBottom: 8, paddingLeft: 16 },
  exercisePickerReorderName: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600' },
  helpText: { fontSize: 13, lineHeight: 20, color: darkTheme.colors.onSurfaceVariant, marginBottom: 12 },
  titleCopy: { flex: 1 },
  screenBody: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: '700', color: darkTheme.colors.primary, marginBottom: 8 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: darkTheme.colors.onSurface, letterSpacing: -0.5 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 1 },
  timerReadout: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerControl: { minHeight: 46 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionHeadingActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: darkTheme.colors.onSurface },
  sectionMeta: { fontSize: 12, color: darkTheme.colors.onSurfaceVariant },
  progressSection: { marginBottom: 16 },
  progressBar: { height: 5, borderRadius: 3, backgroundColor: darkTheme.colors.surfaceVariant },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: darkTheme.colors.surface },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: darkTheme.colors.onSurface, marginTop: 22 },
  emptyMenuButton: { marginTop: 20 },
  menuButton: { flex: 1, minWidth: 0, borderRadius: 14, borderColor: darkTheme.colors.outline },
  primaryAction: { minHeight: 52 },
  completeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flex: 1 },
  completedSet: { borderColor: darkTheme.colors.primary, backgroundColor: '#1B3026' },
  pressed: { opacity: 0.65 },
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  headerSection: {
    paddingBottom: 8,
  },
  listContent: {
    padding: 20, paddingBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 36,
  },
  dateText: {
    fontSize: 15, color: darkTheme.colors.onSurface, fontWeight: '500', flexShrink: 1,
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 20,
  },
  copyButtonLabel: {
    color: darkTheme.colors.onSurfaceVariant,
  },
  durationText: {
    fontSize: 12, color: darkTheme.colors.onSurfaceVariant, fontWeight: '500',
  },
  timerDisplay: {
    fontSize: 26, color: darkTheme.colors.onSurface, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -1, marginTop: 4,
  },
  workoutTimerContainer: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, marginBottom: 16, borderRadius: 16, backgroundColor: darkTheme.colors.surface, borderWidth: 1, borderColor: darkTheme.colors.outlineVariant,
  },
  workoutTimerButtons: {
    alignItems: 'flex-end', gap: 4,
  },
  emptyCard: {
    backgroundColor: 'transparent',
  },
  emptyText: {
    marginTop: 10, color: darkTheme.colors.onSurfaceVariant, fontSize: 14, textAlign: 'center', lineHeight: 24,
  },
  exerciseCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseTitle: {
    color: darkTheme.colors.onSurface, fontWeight: '700', fontSize: 17,
  },
  setContainer: {
    marginBottom: 12, padding: 10, borderWidth: 1, borderRadius: 12, borderColor: darkTheme.colors.outlineVariant,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  setActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryContainer: {
    marginBottom: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryLabel: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 11,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactInput: {
    flex: 1, minWidth: 0, height: 48, backgroundColor: darkTheme.colors.surfaceVariant,
  },
  detailToggle: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  detailBlock: {
    marginBottom: 4,
  },
  setLabel: {
    color: darkTheme.colors.onSurfaceVariant,
    fontWeight: '500',
    fontSize: 13,
  },
  variationInput: {
    flex: 1,
    height: 40,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 12,
  },
  tempoInput: {
    flex: 1,
    height: 40,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 12,
  },
  addEntryButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  durationContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
    width: '100%',
  },
  durationChip: {
    flex: 1,
    borderRadius: 16,
  },
  addButtonFlex: {
    flex: 1, minWidth: 0, borderRadius: 14, justifyContent: 'center',
  },
  saveButtonFlex: {
    flex: 1,
    marginLeft: 8,
  },
  dialog: {
    backgroundColor: darkTheme.colors.surface, borderRadius: 20, width: '90%', maxWidth: 560, alignSelf: 'center', marginHorizontal: 0,
  },
  exercisePickerDialog: { maxHeight: '88%' },
  exercisePickerContent: { flexShrink: 1 },
  exerciseList: {
    maxHeight: 400, flexShrink: 1,
  },
  exerciseButton: {
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  exerciseButtonContent: {
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  exerciseDialogActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  addCustomButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 16,
  },
  exerciseDialogCancelButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  customExerciseNativeInput: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    color: darkTheme.colors.onSurface,
    borderWidth: 1,
    borderColor: darkTheme.colors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  customExerciseScreen: { flex: 1, backgroundColor: darkTheme.colors.surface },
  customExerciseHeader: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  customExerciseTitle: { color: darkTheme.colors.onSurface, fontSize: 22, fontWeight: '700', flexShrink: 1 },
  customExerciseForm: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  customExerciseFormContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  customExerciseActions: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: darkTheme.colors.outlineVariant },
  customExerciseLabel: {
    color: darkTheme.colors.onSurface,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  iconScroll: {
    marginBottom: 16,
  },
  colorScroll: {
    marginBottom: 8,
  },
  customExerciseSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
    paddingVertical: 10,
  },
  customExerciseSwitchText: {
    flex: 1,
  },
  customExerciseSwitchTitle: {
    color: darkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: '600',
  },
  customExerciseSwitchDescription: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  bottomButtons: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: darkTheme.colors.background, borderTopWidth: 1, borderTopColor: darkTheme.colors.outlineVariant,
  },
  templateList: {
    maxHeight: 300,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateButton: {
    flex: 1,
    borderRadius: 16,
  },
  emptyTemplateText: {
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 13,
  },
  textInput: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    color: darkTheme.colors.onSurface,
    borderWidth: 1,
    borderColor: darkTheme.colors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  swipeDeleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    marginBottom: 8,
    borderRadius: 16,
  },
  hiddenExercisesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outlineVariant,
  },
  hiddenExercisesLabel: {
    fontSize: 11,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  hiddenExerciseButton: {
    marginBottom: 8,
    opacity: 0.6,
  },
  renameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  renameInput: {
    flex: 1,
  },
  templateEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 8,
  },
  templateExerciseName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  addExerciseButton: {
    marginTop: 8,
  },
  addExerciseSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outlineVariant,
  },
  addExerciseSectionLabel: {
    fontSize: 11,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  templateEditList: {
    maxHeight: 450,
  },
  templateExerciseCard: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 16,
    borderLeftWidth: 3,
    padding: 8,
    marginBottom: 8,
  },
  templateSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  templateSetLabel: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 11,
    width: 24,
    fontWeight: '500',
  },
  templateEntryRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  templateInput: {
    flex: 1,
    height: 36,
    backgroundColor: darkTheme.colors.surface,
    fontSize: 13,
  },
  templateAddSetButton: {
    alignSelf: 'flex-start',
  },
  templateAddEntryButton: {
    alignSelf: 'flex-start',
  },
  templateEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateSetBlock: {
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outlineVariant,
    paddingBottom: 6,
  },
  templateSetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateEntryBlock: {
    marginLeft: 4,
    marginBottom: 4,
  },
  templateEntryLabel: {
    fontSize: 11,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  templateDetailRow: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 28,
    marginBottom: 4,
  },
  templateDetailInput: {
    flex: 1,
    height: 36,
    backgroundColor: darkTheme.colors.surface,
    fontSize: 13,
  },
  saveNewSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outlineVariant,
  },
  saveNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overwriteSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outlineVariant,
  },
  overwriteLabel: {
    fontSize: 11,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  overwriteButton: {
    marginBottom: 8,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1f0e',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  editingBannerText: {
    flex: 1,
    color: '#d4a054',
    fontSize: 13,
    fontWeight: '600',
  },
});
