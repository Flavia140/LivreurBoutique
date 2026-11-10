import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Segments } from '@/components/Tabs';
import { DELIVERY_STATUS, fcfa, ORDER_STATUS } from '@/lib/format';
import type { Delivery, Order } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Item = { key: string; deliveryId: number; title: string; status: string; total: number; date: string; done: boolean };
const FINISHED = ['delivered', 'cancelled', 'rejected'];

/** Commandes en boutique et colis, les plus récents d'abord. */
export default function ClientOrders() {
  const orders = useApi<{ data: Order[] }>('/orders');
  const deliveries = useApi<{ data: Delivery[] }>('/deliveries');
  useFocusEffect(useCallback(() => { orders.reload(); deliveries.reload(); }, [orders.reload, deliveries.reload]));

  const items: Item[] = [
    ...(orders.data?.data ?? []).filter((o) => o.delivery).map((o) => ({ key: `o${o.id}`, deliveryId: o.delivery!.id, title: o.shop.name, status: ORDER_STATUS[o.status], total: o.total, date: o.created_at, done: FINISHED.includes(o.status) })),
    ...(deliveries.data?.data ?? []).filter((d) => !d.order_id).map((d) => ({ key: `d${d.id}`, deliveryId: d.id, title: `Colis · ${d.pickup.zone?.name} → ${d.dropoff.zone?.name}`, status: DELIVERY_STATUS[d.status], total: d.total, date: d.created_at, done: FINISHED.includes(d.status) })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const shown = items.filter((i) => i.done === (tab === 'history'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <Text style={styles.title}>Mes commandes</Text>
      <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
        <Segments value={tab} onChange={setTab} options={[{ value: 'current', label: 'En cours' }, { value: 'history', label: 'Historique' }]} />
      </View>
      <FlatList data={shown} keyExtractor={(i) => i.key} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 10 }}
        refreshControl={<RefreshControl refreshing={orders.loading} onRefresh={() => { orders.reload(); deliveries.reload(); }} />}
        ListEmptyComponent={<Text style={{ color: colors.textMuted }}>{tab === 'current' ? 'Aucune livraison en cours.' : 'Aucune livraison terminée pour le moment.'}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/track/${item.deliveryId}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={[styles.status, item.done && { color: colors.textMuted }]}>{item.status} · {new Date(item.date).toLocaleDateString('fr-FR')}</Text>
            </View>
            <Text style={styles.total}>{fcfa(item.total)}</Text>
          </Pressable>
        )} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  status: { fontSize: 12, color: colors.primary, marginTop: 4 },
  total: { fontWeight: '700', color: colors.text },
});
