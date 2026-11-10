import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { useShareLocation } from '@/lib/courierLocation';
import { DELIVERY_STATUS, PARCEL_TYPE, fcfa } from '@/lib/format';
import type { Delivery } from '@/lib/types';
import { colors, radius } from '@/theme';

/** Course acceptée : récupération puis remise avec le code du destinataire. */
export default function Mission() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<Delivery | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  useShareLocation(!!d && ['accepted', 'in_progress'].includes(d.status));

  useEffect(() => {
    api<{ data: Delivery }>(`/deliveries/${id}`).then((r) => setD(r.data)).catch((e) => Alert.alert('Erreur', errorMessage(e)));
  }, [id]);

  if (!d) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;

  const act = async (path: string, body?: object) => {
    setBusy(true);
    try {
      setD((await api<{ data: Delivery }>(`/courier/missions/${d.id}/${path}`, { method: 'POST', body })).data);
    } catch (e) {
      Alert.alert('Action impossible', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const client = (d as Delivery & { client?: { first_name: string; phone: string } }).client;

  return (
    <Screen title={`Course #${d.code}`} subtitle={DELIVERY_STATUS[d.status]}>
      <Stop icon="storefront-outline" title="Récupérer" zone={d.pickup.zone?.name} address={d.pickup.address} phone={d.pickup.contact_phone} />
      <Stop icon="home-outline" title="Livrer" zone={d.dropoff.zone?.name} address={d.dropoff.address} phone={d.dropoff.recipient_phone} name={d.dropoff.recipient_name ?? client?.first_name} />
      <Text style={{ color: colors.text, marginBottom: 4 }}>Colis : {d.order_id ? 'Commande boutique' : PARCEL_TYPE[d.parcel_type] ?? d.parcel_type}{d.notes ? ` · ${d.notes}` : ''}</Text>
      <View style={styles.money}>
        <Text>Votre gain : <Text style={{ fontWeight: '700', color: colors.success }}>{fcfa(d.price)}</Text></Text>
        {d.payment_method === 'cash' ? <Text style={{ marginTop: 4 }}>Espèces à encaisser : <Text style={{ fontWeight: '700' }}>{fcfa(d.total)}</Text></Text> : <Text style={{ marginTop: 4, color: colors.textMuted }}>Déjà payée par Mobile Money</Text>}
      </View>

      {d.status === 'accepted' && !d.arrived_pickup_at ? <Button title="Je suis au point de retrait" variant="outline" loading={busy} onPress={() => act('arrived')} style={{ marginBottom: 10 }} /> : null}
      {d.status === 'accepted' ? <Button title="J'ai récupéré le colis" loading={busy} onPress={() => act('pickup')} /> : null}
      {d.status === 'in_progress' && !d.arrived_dropoff_at ? <Button title="Je suis arrivé chez le destinataire" variant="outline" loading={busy} onPress={() => act('arrived')} style={{ marginBottom: 10 }} /> : null}
      {d.status === 'in_progress' ? (
        <>
          <Input label="Code de remise donné par le destinataire" keyboardType="number-pad" maxLength={4} value={code} onChangeText={setCode} />
          <Button title="Confirmer la livraison" loading={busy} disabled={code.length !== 4} onPress={() => act('deliver', { code })} />
        </>
      ) : null}
      {d.status === 'delivered' ? (
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <Text style={{ fontWeight: '700', marginTop: 8 }}>Livraison terminée, merci !</Text>
          <Button title="Retour à l'accueil" variant="outline" style={{ marginTop: 16, alignSelf: 'stretch' }} onPress={() => router.replace('/courier')} />
        </View>
      ) : null}
    </Screen>
  );
}

function Stop({ icon, title, zone, address, phone, name }: { icon: keyof typeof Ionicons.glyphMap; title: string; zone?: string; address: string; phone?: string | null; name?: string | null }) {
  return (
    <View style={styles.stop}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{title}</Text>
        <Text style={{ fontWeight: '600' }}>{zone}</Text>
        <Text style={{ color: colors.text }}>{address}</Text>
        {name ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{name}</Text> : null}
      </View>
      {phone ? <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} hitSlop={10} accessibilityLabel="Appeler"><Ionicons name="call-outline" size={22} color={colors.primary} /></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stop: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  money: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 14, marginVertical: 12 },
});
