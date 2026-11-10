import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fcfa } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Earnings = {
  daily: { date: string; amount: number }[];
  total: number; deliveries: number; bonus: number; cancellation_fees: number; cash_to_remit: number;
  history: { code: string; status: string; route: string; amount: number; at: string }[];
};
const PERIODS = [{ key: 'day', label: 'Jour' }, { key: 'week', label: 'Semaine' }, { key: 'month', label: 'Mois' }] as const;

/** Mes gains (maquette livreur 4). */
export default function EarningsScreen() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const { data, reload } = useApi<{ data: Earnings }>(`/courier/earnings?period=${period}`);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const e = data?.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Mes gains</Text>
        <View style={styles.tabs}>
          {PERIODS.map((p) => (
            <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.tab, period === p.key && styles.tabActive]}>
              <Text style={{ color: period === p.key ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.big}>{(e?.total ?? 0).toLocaleString('fr-FR')} <Text style={{ fontSize: 16 }}>FCFA</Text></Text>
        <View style={styles.row}>
          <Mini label="Courses" value={String(e?.deliveries ?? 0)} />
          <Mini label="Bonus" value={fcfa(e?.bonus ?? 0)} />
          <Mini label="Annulations" value={fcfa(e?.cancellation_fees ?? 0)} />
        </View>
        {e?.daily ? <WeekChart days={e.daily} /> : null}
        {e?.cash_to_remit ? (
          <View style={styles.cash}><Text style={{ color: colors.text }}>Espèces à reverser à YAKO : <Text style={{ fontWeight: '700' }}>{fcfa(e.cash_to_remit)}</Text></Text></View>
        ) : null}
        <Text style={styles.section}>Historique</Text>
        {e?.history.map((h) => (
          <View key={h.code} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>#{h.code}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{h.route}{h.status === 'cancelled' ? ' · annulée' : ''}</Text>
            </View>
            <Text style={{ fontWeight: '700' }}>{fcfa(h.amount)}</Text>
          </View>
        ))}
        {e && e.history.length === 0 ? <Text style={{ color: colors.textMuted }}>Aucune course sur cette période.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const DAY = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** Gains des 7 derniers jours en barres (aujourd'hui en orange vif). */
function WeekChart({ days }: { days: { date: string; amount: number }[] }) {
  const max = Math.max(...days.map((d) => d.amount), 1);
  return (
    <View style={styles.chart} accessibilityLabel={`Gains des 7 derniers jours : ${days.map((d) => fcfa(d.amount)).join(', ')}`}>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 10 }}>7 derniers jours</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 8 }}>
        {days.map((d, i) => (
          <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            {d.amount ? <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 2 }}>{(d.amount / 1000).toFixed(1)}k</Text> : null}
            <View style={{ width: '100%', height: Math.max(4, (d.amount / max) * 90), borderRadius: 4, backgroundColor: i === days.length - 1 ? colors.primary : '#FFC9A3' }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {days.map((d) => <Text key={d.date} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: colors.textMuted }}>{DAY[new Date(`${d.date}T12:00:00`).getDay()]}</Text>)}
      </View>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text><Text style={{ fontWeight: '700', marginTop: 4 }}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  big: { fontSize: 32, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', gap: 12, marginTop: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  chart: { marginTop: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  cash: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, marginTop: 16 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
