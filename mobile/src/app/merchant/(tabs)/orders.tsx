import { useCallback, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Button } from '@/components/Button';
import { Segments } from '@/components/Tabs';
import { api, errorMessage } from '@/lib/api';
import { DELIVERY_STATUS, fcfa, ORDER_STATUS } from '@/lib/format';
import type { Order, Paginated } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Tab = 'all' | 'in_progress' | 'done';

/** Commandes reçues par la boutique (maquette commerçant 3) : confirmer ou refuser. */
export default function MerchantOrders() {
  const [tab, setTab] = useState<Tab>('all');
  const list = useApi<Paginated<Order>>(`/merchant/orders?tab=${tab}`);
  useFocusEffect(useCallback(() => { list.reload(); }, [list.reload]));
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (o: Order, action: 'confirm' | 'reject') => {
    const run = async () => {
      setBusy(o.id);
      try {
        await api(`/merchant/orders/${o.id}/${action}`, { method: 'POST', body: action === 'reject' ? { reason: 'Produit indisponible' } : {} });
        list.reload();
      } catch (e) { Alert.alert('Action impossible', errorMessage(e)); }
      finally { setBusy(null); }
    };
    if (action === 'confirm') return run();
    Alert.alert('Refuser la commande ?', 'Le client sera remboursé et le stock remis en vente.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <Text style={styles.title}>Commandes</Text>
      <View style={{ paddingHorizontal: 20 }}>
        <Segments value={tab} onChange={setTab} options={[{ value: 'all', label: 'Toutes' }, { value: 'in_progress', label: 'En cours' }, { value: 'done', label: 'Terminées' }]} />
      </View>
      <FlatList
        data={list.data?.data ?? []}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={list.loading} onRefresh={list.reload} />}
        ListEmptyComponent={list.loading ? undefined : <Text style={styles.empty}>{list.error ?? 'Aucune commande pour le moment.'}</Text>}
        renderItem={({ item: o }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.code}>#{o.code}</Text>
              <Text style={[styles.status, o.status === 'pending_confirmation' && { color: colors.primary }]}>{ORDER_STATUS[o.status]}</Text>
            </View>
            <Text style={styles.small}>{new Date(o.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}{o.client ? ` · ${o.client.first_name} ${o.client.last_name ?? ''}` : ''}</Text>
            {o.items.map((i) => (
              <View key={i.product_id} style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={{ flex: 1, color: colors.text }}>{i.quantity} × {i.name}</Text>
                <Text style={{ color: colors.text }}>{fcfa(i.line_total)}</Text>
              </View>
            ))}
            <View style={[styles.rowBetween, styles.total]}>
              <Text style={{ fontWeight: '700' }}>Montant boutique</Text>
              <Text style={{ fontWeight: '800', color: colors.primary }}>{fcfa(o.subtotal)}</Text>
            </View>
            {o.delivery && o.status !== 'pending_confirmation' ? (
              <Text style={styles.small}>Livraison : {DELIVERY_STATUS[o.delivery.status]}{o.delivery.courier ? ` · ${o.delivery.courier.first_name}` : ''}{o.delivery.payment_method === 'cash' ? ' · payé en espèces' : ''}</Text>
            ) : null}
            {o.rejection_reason ? <Text style={styles.small}>Motif : {o.rejection_reason}</Text> : null}
            {o.status === 'pending_confirmation' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button title="Refuser" variant="outline" onPress={() => act(o, 'reject')} disabled={busy === o.id} style={{ flex: 1 }} />
                <Button title="Confirmer" onPress={() => act(o, 'confirm')} loading={busy === o.id} style={{ flex: 1 }} />
              </View>
            ) : null}
            {o.client && o.status !== 'delivered' && o.status !== 'rejected' ? (
              <Pressable onPress={() => Linking.openURL(`tel:${o.client!.phone}`)}><Text style={styles.link}>Appeler le client</Text></Pressable>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', padding: 20, paddingBottom: 8 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontWeight: '700', fontSize: 15 },
  status: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  total: { borderTopWidth: 1, borderColor: colors.border, marginTop: 10, paddingTop: 10 },
  link: { color: colors.primary, fontWeight: '600', marginTop: 10 },
});
