import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { api, type Zone } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useCity } from '@/lib/city';
import { fcfa } from '@/lib/format';
import { colors, radius } from '@/theme';

type Quote = { zone: Zone; total: number };

/** Adresse et zone de livraison avec tarif fixe (maquettes client 6 et 7). */
export default function CheckoutAddress() {
  const { user } = useAuth();
  const cart = useCart();
  const { city } = useCity();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(user?.zone?.id ?? null);
  const [address, setAddress] = useState(user?.address ?? '');
  const [recipientPhone, setRecipientPhone] = useState('');

  useEffect(() => {
    const from = cart.shop?.zone?.id;
    (async () => {
      const zones = (await api<{ data: Zone[] }>('/zones')).data.filter((z) => !city || z.city === city);
      const shopZone = from ?? (await api<{ data: { zone: Zone } }>(`/shops/${cart.shop?.id}`)).data.zone.id;
      const results = await Promise.all(zones.map(async (zone) => {
        try {
          const q = await api<{ data: { total: number } }>(`/tariffs/quote?from=${shopZone}&to=${zone.id}`);
          return { zone, total: q.data.total };
        } catch { return null; }
      }));
      setQuotes(results.filter((r): r is Quote => r !== null));
    })().catch(() => setQuotes([]));
  }, [cart.shop?.id, cart.shop?.zone?.id, city]);

  const selected = quotes?.find((q) => q.zone.id === zoneId);

  return (
    <Screen title="Adresse de livraison">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{user?.first_name} {user?.last_name}</Text>
        <Input label="Adresse ou repère" value={address} onChangeText={setAddress} placeholder="Rue 12, à côté de l'école primaire" />
        <Input label="Téléphone du destinataire (si ce n'est pas vous)" keyboardType="phone-pad" value={recipientPhone} onChangeText={setRecipientPhone} placeholder={user?.phone} />
      </View>

      <Text style={styles.section}>Choisir une zone de livraison</Text>
      {!quotes ? <ActivityIndicator color={colors.primary} /> : null}
      {quotes?.map((q) => (
        <Pressable key={q.zone.id} style={[styles.zone, zoneId === q.zone.id && styles.zoneActive]} onPress={() => setZoneId(q.zone.id)}>
          <Ionicons name={zoneId === q.zone.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={zoneId === q.zone.id ? colors.primary : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.zoneName}>{q.zone.name} ({q.zone.city})</Text>
            <Text style={styles.zonePrice}>{fcfa(q.total)}</Text>
          </View>
        </Pressable>
      ))}
      {quotes && quotes.length === 0 ? <Text style={{ color: colors.textMuted }}>Aucune zone desservie depuis cette boutique pour le moment.</Text> : null}

      <View style={styles.notice}>
        <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
        <Text style={styles.noticeText}>Tarifs fixes par zone : pas de tarification dynamique. Le prix ne change ni avec la distance ni avec l'heure.</Text>
      </View>
      <View style={[styles.notice, { backgroundColor: '#EEF3FE' }]}>
        <Ionicons name="time-outline" size={18} color="#1A73E8" />
        <Text style={styles.noticeText}>Livraisons de 7h00 à 21h00. Une commande passée hors de ce créneau part dès 7h00.</Text>
      </View>

      <Button title="Continuer" disabled={!selected || !address} onPress={() => router.push({
        pathname: '/checkout/payment',
        params: { zoneId: String(selected!.zone.id), zoneName: selected!.zone.name, fee: String(selected!.total), address, recipientPhone },
      })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, paddingBottom: 2, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  zoneActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  zoneName: { fontSize: 14, color: colors.text },
  zonePrice: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, marginTop: 12 },
  noticeText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 17 },
});
