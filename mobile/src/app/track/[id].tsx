import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
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
  { key: 'at_pickup', label: 'Livreur au point de retrait', done: (d) => !!d.arrived_pickup_at || ['in_progress', 'delivered'].includes(d.status) },
  { key: 'road', label: 'En cours de livraison', done: (d) => ['in_progress', 'delivered'].includes(d.status) },
  { key: 'arrived', label: 'Livreur arrivé chez vous', done: (d) => !!d.arrived_dropoff_at || d.status === 'delivered' },
  { key: 'done', label: 'Livrée', done: (d) => d.status === 'delivered' },
];

/** Suivi de commande (maquette client 9). Actualisé toutes les 5 secondes. */
export default function Track() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

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

  const rate = async () => {
    setSending(true);
    try {
      const body = { score, comment: comment.trim() || undefined };
      await api(`/deliveries/${id}/rate`, { method: 'POST', body });
      if (order) await api(`/orders/${order.id}/rate`, { method: 'POST', body });
      setDelivery({ ...delivery, rated: true, rating: { score, comment: comment.trim() || null } });
      Alert.alert('Merci !', 'Votre avis aide à garder un service de qualité.');
    } catch (e) { Alert.alert('Erreur', errorMessage(e)); }
    finally { setSending(false); }
  };

  const deliveredAt = delivery.delivered_at ? new Date(delivery.delivered_at) : null;
  const when = deliveredAt ? `${deliveredAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${deliveredAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '';
  const shareProof = () => Share.share({
    message: `Preuve de livraison YAKO\nLivraison #${delivery.code}\n${delivery.pickup.zone?.name} → ${delivery.dropoff.zone?.name}\nLivrée le ${when}${delivery.courier ? ` par ${delivery.courier.first_name}` : ''}\nConfirmée par code de remise. Montant : ${fcfa(delivery.total)}`,
  }).catch(() => undefined);

  return (
    <Screen title={finished ? 'Commande' : 'Commande en cours'}>
      <Text style={styles.code}>Commande #{delivery.code}</Text>
      <Text style={styles.status}>{order?.status === 'rejected' ? 'Refusée par la boutique' : DELIVERY_STATUS[delivery.status]}</Text>

      {delivery.status === 'in_progress' && delivery.arrived_dropoff_at ? (
        <View style={styles.arrived}>
          <Ionicons name="bicycle" size={28} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Votre livreur est arrivé !</Text>
            <Text style={{ color: '#fff' }}>Donnez-lui le code ci-dessous pour recevoir votre colis.</Text>
          </View>
        </View>
      ) : null}

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
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Évaluez votre livraison</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setScore(n)} accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`}><Ionicons name={n <= score ? 'star' : 'star-outline'} size={32} color="#F5A623" /></Pressable>)}
          </View>
          <TextInput value={comment} onChangeText={setComment} placeholder="Votre avis nous aide à mieux vous servir…" multiline maxLength={500}
            placeholderTextColor="#9AA0A6" style={styles.comment} />
          <Button title="Envoyer mon avis" onPress={rate} loading={sending} disabled={!score} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </View>
      ) : null}

      {delivery.status === 'delivered' ? (
        <View style={styles.proof}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>Preuve de livraison</Text>
            <View style={styles.badge}><Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>Livrée</Text></View>
          </View>
          <ProofRow icon="cube-outline" label="Colis" value={order ? `${order.items.length} article(s) de ${order.shop.name}` : PARCEL[delivery.parcel_type] ?? delivery.parcel_type} />
          <ProofRow icon="navigate-outline" label="Trajet" value={`${delivery.pickup.zone?.name} → ${delivery.dropoff.zone?.name}`} />
          <ProofRow icon="time-outline" label="Livraison" value={when} />
          {delivery.courier ? <ProofRow icon="person-outline" label="Livreur" value={`${delivery.courier.first_name}${delivery.courier.verified ? ' (vérifié)' : ''}`} /> : null}
          <ProofRow icon="shield-checkmark-outline" label="Confirmation" value="Code de remise validé" />
          {delivery.rating ? <ProofRow icon="star-outline" label="Votre note" value={`${'★'.repeat(delivery.rating.score)}${delivery.rating.comment ? ` · « ${delivery.rating.comment} »` : ''}`} /> : null}
          <Button title="Partager la preuve" variant="outline" onPress={shareProof} style={{ marginTop: 12 }} />
        </View>
      ) : null}

      {cancellable ? <Button title="Annuler la commande" variant="outline" onPress={cancel} style={{ marginTop: 24 }} /> : null}
      <Button title="Retour à l'accueil" variant="ghost" onPress={() => router.replace('/client')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const PARCEL: Record<string, string> = { document: 'Documents', food: 'Repas', clothes: 'Vêtements', other: 'Colis' };

function ProofRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ color: colors.textMuted, width: 90 }}>{label}</Text>
      <Text style={{ flex: 1, color: colors.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  arrived: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, marginTop: 16 },
  comment: { alignSelf: 'stretch', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, minHeight: 70, marginTop: 12, fontSize: 14, textAlignVertical: 'top' },
  proof: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginTop: 24 },
  badge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
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
