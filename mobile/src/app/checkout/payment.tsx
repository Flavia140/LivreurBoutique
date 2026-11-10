import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PaymentMethods, type Method } from '@/components/PaymentMethods';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { fcfa } from '@/lib/format';
import { normalizeBeninPhone } from '@/lib/phone';
import type { Order } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { usePayment } from '@/lib/usePayment';
import { colors, radius } from '@/theme';

type Params = { zoneId?: string; zoneName?: string; fee?: string; address?: string; recipientPhone?: string; deliveryId?: string; total?: string };

/**
 * Paiement (maquette client 8). Deux cas : une commande en boutique (créée ici depuis le panier)
 * ou un colis déjà créé (deliveryId).
 */
export default function CheckoutPayment() {
  const params = useLocalSearchParams<Params>();
  const { user } = useAuth();
  const cart = useCart();
  const payment = usePayment();
  const [network, setNetwork] = useState<Method>('MTN');
  const options = useApi<{ data: { cash_limit: number } }>('/payment-options');
  const [phone, setPhone] = useState(user?.phone.replace('+229', '') ?? '');
  const [creating, setCreating] = useState(false);
  const created = useRef<{ deliveryId: number } | null>(params.deliveryId ? { deliveryId: Number(params.deliveryId) } : null);

  const isOrder = !params.deliveryId;
  const fee = Number(params.fee ?? 0);
  const total = isOrder ? cart.subtotal + fee : Number(params.total);

  const submit = async () => {
    try {
      if (!created.current) {
        setCreating(true);
        const res = await api<{ data: Order }>('/orders', { method: 'POST', body: {
          shop_id: cart.shop!.id,
          items: cart.lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
          dropoff_zone_id: Number(params.zoneId),
          dropoff_address: params.address,
          recipient_phone: params.recipientPhone ? normalizeBeninPhone(params.recipientPhone) : undefined,
        } });
        created.current = { deliveryId: res.data.delivery!.id };
      }
    } catch (e) {
      Alert.alert('Commande impossible', errorMessage(e));
      return;
    } finally {
      setCreating(false);
    }

    let ok = false;
    if (network === 'CASH') {
      try {
        await api(`/deliveries/${created.current.deliveryId}/pay-cash`, { method: 'POST' });
        ok = true;
      } catch (e) {
        Alert.alert('Paiement à la livraison impossible', errorMessage(e));
      }
    } else {
      ok = await payment.pay(created.current.deliveryId, network, normalizeBeninPhone(phone));
    }
    if (ok) {
      if (isOrder) cart.clear();
      router.dismissAll();
      router.replace(`/track/${created.current.deliveryId}`);
    }
  };

  const busy = creating || payment.state === 'starting' || payment.state === 'waiting';

  return (
    <Screen title="Choisir un mode de paiement">
      <View style={styles.summary}>
        {isOrder ? (
          <>
            <Row label={`Sous-total · ${cart.shop?.name}`} value={fcfa(cart.subtotal)} />
            <Row label={`Livraison (zone ${params.zoneName})`} value={fcfa(fee)} />
          </>
        ) : null}
        <Row label="Total" value={fcfa(total)} bold />
      </View>

      <PaymentMethods value={network} onChange={setNetwork} cashLimit={options.data?.data.cash_limit} cashAllowed={options.data ? total <= options.data.data.cash_limit : false} />
      {network !== 'CASH' ? (
        <Input label={`Numéro ${network === 'MTN' ? 'MTN' : 'Moov'} à débiter`} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13, marginVertical: 12 }}>Préparez {fcfa(total)} en espèces pour le livreur. Il vous demandera le code de remise.</Text>
      )}

      {payment.state === 'waiting' ? (
        <View style={styles.waiting}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ flex: 1, color: colors.text }}>Validez le paiement sur votre téléphone (code secret Mobile Money)…</Text>
        </View>
      ) : null}
      {payment.error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{payment.error}</Text> : null}

      {network !== 'CASH' ? <View style={styles.secure}><Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} /><Text style={{ fontSize: 12, color: colors.textMuted }}>Paiement 100 % sécurisé : l'argent est bloqué jusqu'à la livraison.</Text></View> : null}
      <Button title={network === 'CASH' ? 'Confirmer la commande' : `Payer ${fcfa(total)}`} loading={busy} onPress={submit} disabled={network !== 'CASH' && phone.replace(/\D/g, '').length < 8} />
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
      <Text style={{ color: bold ? colors.text : colors.textMuted, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: bold ? '700' : '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 20 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md, marginBottom: 12 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 12 },
});
