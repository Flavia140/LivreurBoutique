import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TrackingMap } from '@/components/TrackingMap';
import { api, errorMessage } from '@/lib/api';
import { DELIVERY_STATUS, fcfa } from '@/lib/format';
import type { Delivery, Order } from '@/lib/types';
import { colors, radius } from '@/theme';

const STEPS: { key: string; label: string; done: (d: Delivery) => boolean }[] = [
  { key: 'paid', label: 'Commande validée', done: (d) => d.status !== 'awaiting_payment' },
  { key: 'prep', label: 'Préparation en cours', done: (d) => ['pending', 'accepted', 'in_progress', 'delivered'].includes(d.status) },
  { key: 'courier', label: 'Livreur étudiant trouvé', done: (d) => ['accepted', 'in_progress', 'delivered'].includes(d.status) },
  { key: 'road', label: 'En cours de livraison', done: (d) => ['in_progress', 'delivered'].includes(d.status) },
  { key: 'done', label: 'Livrée', done: (d) => d.status === 'delivered' },
];

/** Suivi de commande (maquette client 9). Actualisé toutes les 5 secondes. */
export default function Track() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = (await api<{ data: Delivery }>(`/deliveries/${id}`)).data;
        if (!alive) return;
        setDelivery(d);
        if (d.order_id) setOrder((await api<{ data: Order }>(`/orders/${d.order_id}`)).data);
      } catch { /* on garde l'affichage précédent */ }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  if (!delivery) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;

  const steps = delivery.order_id ? STEPS : STEPS.filter((s) => s.key !== 'prep');
  const cancellable = ['awaiting_payment', 'awaiting_merchant', 'pending', 'accepted'].includes(delivery.status);
  const finished = delivery.status === 'delivered' || delivery.status === 'cancelled';

  const cancel = () => Alert.alert('Annuler la commande ?', delivery.status === 'accepted' ? 'Le livreur est en route : des frais fixes seront retenus.' : 'Annulation gratuite, vous serez remboursé.', [
    { text: 'Non', style: 'cancel' },
    { text: 'Annuler la commande', style: 'destructive', onPress: async () => {
      try { setDelivery((await api<{ data: Delivery }>(`/deliveries/${id}/cancel`, { method: 'POST' })).data); } catch (e) { Alert.alert('Erreur', errorMessage(e)); }
    } },
  ]);

  const rate = async (s: number) => {
    setScore(s);
    try {
      await api(`/deliveries/${id}/rate`, { method: 'POST', body: { score: s } });
      if (order) await api(`/orders/${order.id}/rate`, { method: 'POST', body: { score: s } });
      Alert.alert('Merci !', 'Votre avis aide à garder un service de qualité.');
    } catch (e) { Alert.alert('Erreur', errorMessage(e)); }
  };

  return (
    <Screen title={finished ? 'Commande' : 'Commande en cours'}>
      <Text style={styles.code}>Commande #{delivery.code}</Text>
      <Text style={styles.status}>{order?.status === 'rejected' ? 'Refusée par la boutique' : DELIVERY_STATUS[delivery.status]}</Text>

      {delivery.confirmation_code && !finished ? (
        <View style={styles.codeBox}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Code de remise à donner au livreur à l'arrivée</Text>
          <Text style={styles.codeValue}>{delivery.confirmation_code}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        {steps.map((s) => {
          const done = s.done(delivery);
          return (
            <View key={s.key} style={styles.step}>
              <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? colors.success : colors.border} />
              <Text style={[styles.stepText, done && { color: colors.text, fontWeight: '600' }]}>{s.label}</Text>
            </View>
          );
        })}
      </View>

      {['accepted', 'in_progress'].includes(delivery.status) ? <TrackingMap courier={delivery.courier_position} /> : null}

      {delivery.courier ? (
        <View style={styles.courier}>
          <View style={styles.avatar}><Ionicons name="person" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600' }}>{delivery.courier.first_name} {delivery.courier.verified ? '· Livreur vérifié' : ''}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{delivery.courier.vehicle_type === 'voiture' ? 'Voiture' : 'Moto'} · ★ {delivery.courier.rating_avg?.toFixed(1) ?? 'Nouveau'}</Text>
          </View>
          {delivery.courier.phone ? (
            <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${delivery.courier!.phone}`)}><Text style={{ color: colors.primary, fontWeight: '600' }}>Contacter</Text></Pressable>
          ) : null}
        </View>
      ) : null}

      {order ? (
        <View style={styles.items}>
          {order.items.map((i) => <Text key={i.product_id ?? i.name} style={{ color: colors.text }}>{i.quantity} × {i.name}</Text>)}
        </View>
      ) : null}
      <Text style={{ textAlign: 'right', fontWeight: '700', marginTop: 8 }}>
        {delivery.payment_method === 'cash' && delivery.status !== 'delivered' ? `À payer au livreur en espèces : ${fcfa(delivery.total)}` : `Total : ${fcfa(delivery.total)}`}
      </Text>

      {delivery.status === 'delivered' && !delivery.rated ? (
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Notez votre livraison</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => rate(n)}><Ionicons name={n <= score ? 'star' : 'star-outline'} size={32} color="#F5A623" /></Pressable>)}
          </View>
        </View>
      ) : null}

      {cancellable ? <Button title="Annuler la commande" variant="outline" onPress={cancel} style={{ marginTop: 24 }} /> : null}
      <Button title="Retour à l'accueil" variant="ghost" onPress={() => router.replace('/client')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 15, fontWeight: '700', color: colors.text },
  status: { fontSize: 13, color: colors.primary, marginTop: 4 },
  codeBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 14, marginTop: 16, alignItems: 'center' },
  codeValue: { fontSize: 32, fontWeight: '800', letterSpacing: 8, color: colors.primary, marginTop: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepText: { color: colors.textMuted, fontSize: 14 },
  courier: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  call: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  items: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 16, paddingTop: 12, gap: 4 },
});
