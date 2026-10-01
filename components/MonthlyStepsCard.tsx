import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, IconButton, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { darkTheme } from '@/constants/theme';
import { getMonthlySteps, isStepHistoryAvailable, requestStepAccess, StepDay } from '@/modules/slowrep-health';

import { shiftMonth, summarizeSteps } from '@/utils/stepSummary';

const preferenceKey = 'slowrep-step-history-enabled';
type Result = { month: string; status: 'loading' | 'ready' | 'error'; days: StepDay[] };

export default function MonthlyStepsCard({ month, onMonthChange }: { month: string; onMonthChange: (month: string) => void }) {
  const [available] = useState(isStepHistoryAvailable);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result>({ month, status: 'loading', days: [] });

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(preferenceKey)
      .then(value => { if (active) setEnabled(value === 'true'); })
      .catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setRevision(value => value + 1);
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => {
    if (!available || !enabled) return;
    let active = true;
    setResult({ month, status: 'loading', days: [] });
    getMonthlySteps(month).then(days => {
      if (active) setResult({ month, status: 'ready', days });
    }).catch(() => {
      if (active) setResult({ month, status: 'error', days: [] });
    });
    return () => { active = false; };
  }, [available, enabled, month, revision]));

  const connect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      await requestStepAccess();
      await AsyncStorage.setItem(preferenceKey, 'true');
      setEnabled(true);
      setRevision(value => value + 1);
    } catch {
      setMessage('連携を開始できませんでした。もう一度お試しください。');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await AsyncStorage.removeItem(preferenceKey);
      setEnabled(false);
      setResult({ month, status: 'loading', days: [] });
      setMessage(null);
    } catch {
      setMessage('表示設定を保存できませんでした。もう一度お試しください。');
    }
  };

  if (Platform.OS !== 'ios') return null;
  const loading = enabled === null || (enabled && (result.month !== month || result.status === 'loading'));
  const days = enabled && result.month === month && result.status === 'ready' ? result.days : [];
  const summary = summarizeSteps(days);
  const format = (value: number | null) => value === null ? '—' : value.toLocaleString('ja-JP');
  const title = `${Number(month.slice(0, 4))}年${Number(month.slice(5))}月`;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.heading}>
          <View><Text style={styles.eyebrow}>歩数 · 月間サマリー</Text><Text style={styles.title}>{title}</Text></View>
          <View style={styles.navigation}>
            <IconButton icon="chevron-left" accessibilityLabel="前の月の歩数" onPress={() => onMonthChange(shiftMonth(month, -1))} />
            <IconButton icon="chevron-right" accessibilityLabel="次の月の歩数" onPress={() => onMonthChange(shiftMonth(month, 1))} />
          </View>
        </View>
        {!available ? (
          <Text style={styles.help}>この端末ではヘルスケアの歩数を利用できません。</Text>
        ) : loading ? (
          <View style={styles.loading} accessibilityLabel="歩数を読み込み中">
            <ActivityIndicator size="small" />
            <Text style={styles.help}>歩数を読み込み中…</Text>
          </View>
        ) : !enabled ? (
          <>
            <Text style={styles.help}>1ヶ月の合計と歩いたペースを、ひと目で。ヘルスケアの歩数だけを読み取り、外部には送信しません。</Text>
            <Button mode="contained" icon="heart-outline" onPress={connect} loading={connecting} disabled={connecting} style={styles.connect}>ヘルスケアと連携</Button>
          </>
        ) : (
          <>
            <View style={styles.metrics}>
              <View style={styles.total}>
                <Text style={styles.help}>月間合計</Text>
                <Text style={styles.value}>{format(summary.total)}<Text style={styles.unit}> 歩</Text></Text>
              </View>
              <View style={styles.average}>
                <Text style={styles.help}>1日平均</Text>
                <Text style={styles.averageValue}>{format(summary.average)}<Text style={styles.unit}> 歩</Text></Text>
                <Text style={styles.caption}>記録のある{summary.recordedDays}日で計算</Text>
              </View>
            </View>
            {summary.total !== null ? (
              <View>
                <View style={styles.chartHeading}><Text style={styles.caption}>日ごとの歩数</Text><Text style={styles.caption}>最大 {format(summary.maximum)}歩</Text></View>
                <View style={styles.chart} accessible accessibilityLabel={days.map(value => `${Number(value.day.slice(-2))}日 ${value.steps === null ? 'データなし' : `${format(value.steps)}歩`}`).join('、')}>
                  {days.map(value => (
                    <View key={value.day} style={styles.barSlot}>
                      <View style={[styles.bar, { height: value.steps === null ? 2 : Math.max(3, value.steps / Math.max(1, summary.maximum) * 72), backgroundColor: value.steps === null ? darkTheme.colors.outline : darkTheme.colors.primary }]} />
                    </View>
                  ))}
                </View>
                <View style={styles.chartLabels}><Text style={styles.caption}>1日</Text><Text style={styles.caption}>15日</Text><Text style={styles.caption}>{days.length}日</Text></View>
                <Text style={styles.caption}>ヘルスケアで取得できた記録の合計です。今月は今日までを集計。</Text>
              </View>
            ) : (
              <Text style={styles.help}>{result.status === 'error'
                ? '歩数を読み込めませんでした。端末のロックを解除して、再読み込みしてください。'
                : 'この月の歩数を取得できません。記録がない場合や、読み取りが許可されていない場合は「—」になります。ヘルスケアの共有設定でSlowRepの「歩数」を確認できます。'}</Text>
            )}
            <View style={styles.actions}>
              <Button icon="refresh" onPress={() => setRevision(value => value + 1)}>再読み込み</Button>
              <Button textColor={darkTheme.colors.onSurfaceVariant} onPress={disconnect}>表示をオフ</Button>
            </View>
          </>
        )}
        {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: darkTheme.colors.surfaceVariant, marginBottom: 16 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navigation: { flexDirection: 'row' },
  eyebrow: { color: darkTheme.colors.primary, fontSize: 12, marginBottom: 4 },
  title: { color: darkTheme.colors.onSurface, fontSize: 20, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 16 },
  total: { flexGrow: 1 },
  average: { flexGrow: 1 },
  averageValue: { color: darkTheme.colors.onSurface, fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  caption: { color: darkTheme.colors.onSurfaceVariant, fontSize: 11, lineHeight: 17 },
  chartHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  chart: { height: 76, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 2, minWidth: 1 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  value: { color: darkTheme.colors.primary, fontSize: 36, fontWeight: '600', marginBottom: 8, fontVariant: ['tabular-nums'] },
  unit: { color: darkTheme.colors.onSurfaceVariant, fontSize: 16 },
  help: { color: darkTheme.colors.onSurfaceVariant, fontSize: 13, lineHeight: 21 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  connect: { marginTop: 16, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 },
  message: { color: darkTheme.colors.error, marginTop: 12, lineHeight: 21 },
});
