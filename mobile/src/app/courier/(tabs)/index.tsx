import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DELIVERY_STATUS, fcfa } from '@/lib/format';
import type { Delivery } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Dashboard = { online: boolean; today_deliveries: number; today_earnings: number; rating_avg: number | null; current: Delivery | null };

/** Tableau de bord livreur (maquette livreur 3). */
export default function CourierHome() {
  const { user } = useAuth();
  const { data, reload, loading, setData } = useApi<{ data: Dashboard }>('/courier/dashboard');
  const [switching, setSwitching] = useState(false);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const d = data?.data;

  const toggle = async (value: boolean) => {
    setSwitching(true);
    try {
      await api('/courier/availability', { method: 'PATCH', body: { available: value } });
      if (d) setData({ data: { ...d, online: value } });
    } catch (e) {
      Alert.alert('Impossible', errorMessage(e));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Bonjour, {user?.first_name} 👋</Text>
            <Text style={styles.sub}>Livreur étudiant</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Switch value={!!d?.online} onValueChange={toggle} disabled={switching} trackColor={{ true: colors.success }} />
            <Text style={[styles.sub, { color: d?.online ? colors.success : colors.textMuted }]}>{d?.online ? 'En ligne' : 'Hors ligne'}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="Aujourd'hui" value={String(d?.today_deliveries ?? 0)} unit="courses" />
          <Stat label="Gains du jour" value={(d?.today_earnings ?? 0).toLocaleString('fr-FR')} unit="FCFA" />
          <Stat label="Note" value={d?.rating_avg ? `★ ${d.rating_avg.toFixed(1)}` : '–'} />
        </View>

        <Text style={styles.section}>Course en cours</Text>
        {d?.current ? (
          <Pressable style={styles.card} onPress={() => router.push(`/courier/mission/${d.current!.id}`)}>
            <Text style={styles.code}>#{d.current.code}</Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>{d.current.pickup.zone?.name} → {d.current.dropoff.zone?.name}</Text>
            <Text style={{ color: colors.primary, marginTop: 6, fontSize: 12 }}>{DELIVERY_STATUS[d.current.status]}</Text>
            <Text style={{ alignSelf: 'flex-end', color: colors.primary, fontWeight: '600' }}>Voir détails</Text>
          </Pressable>
        ) : (
          <View style={styles.card}>
            <Text style={{ color: colors.textMuted }}>{d?.online ? 'Aucune course en cours. Consultez les courses disponibles.' : 'Passez en ligne pour recevoir des courses (7h–21h).'}</Text>
            {d?.online ? <Pressable onPress={() => router.push('/courier/missions')}><Text style={{ color: colors.primary, fontWeight: '600', marginTop: 8 }}>Voir les courses disponibles</Text></Pressable> : null}
          </View>
        )}
        {d?.current?.cash_to_collect ? <Text style={{ marginTop: 8, color: colors.text }}>À encaisser en espèces : {fcfa(d.current.cash_to_collect)}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {unit ? <Text style={styles.statLabel}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  hello: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  stat: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginVertical: 4 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16 },
  code: { fontWeight: '700', color: colors.text },
});
