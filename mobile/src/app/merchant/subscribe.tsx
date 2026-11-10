import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PaymentMethods, type Method } from '@/components/PaymentMethods';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PLAN_INFO } from '@/lib/merchant';
import { normalizeBeninPhone } from '@/lib/phone';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Plan = { plan: string; label: string; amount: number; months: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Choix et paiement de l'abonnement commerçant (maquette commerçant 1). */
export default function Subscribe() {
  const { user } = useAuth();
  const plans = useApi<{ data: Plan[] }>('/merchant/plans');
  const [plan, setPlan] = useState('quarterly');
  const [network, setNetwork] = useState<Method>('MTN');
  const [phone, setPhone] = useState(user?.phone?.replace('+229', '') ?? '');
  const [state, setState] = useState<'idle' | 'waiting'>('idle');
  const stop = useRef(false);

  const pay = async () => {
    const e164 = normalizeBeninPhone(phone);
    if (!/^\+229\d{8,10}$/.test(e164)) return Alert.alert('Numéro invalide', 'Saisissez le numéro Mobile Money à débiter.');
    stop.current = false;
    setState('waiting');
    try {
      const res = await api<{ data: { subscription_id: number } }>('/merchant/subscriptions', { method: 'POST', body: { plan, network, phone: e164 } });
      for (let i = 0; i < 60 && !stop.current; i++) {
        await sleep(3000);
        const s = await api<{ data: { status: string } }>(`/merchant/subscriptions/${res.data.subscription_id}`).catch(() => null);
        if (s?.data.status === 'active') {
          setState('idle');
          Alert.alert('Abonnement activé', 'Vous pouvez maintenant créer votre boutique.');
          return router.replace('/merchant');
        }
        if (s?.data.status === 'failed' || s?.data.status === 'cancelled') throw new Error('Paiement refusé ou annulé.');
      }
      if (!stop.current) throw new Error("Nous n'avons pas reçu la confirmation. Réessayez.");
    } catch (e) {
      Alert.alert('Paiement non abouti', errorMessage(e));
    }
    setState('idle');
  };

  if (state === 'waiting') {
    return (
      <Screen title="Validez le paiement" subtitle={`Une demande a été envoyée sur votre téléphone ${network}. Composez votre code secret pour confirmer.`} back={false}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
        <Button title="Annuler" variant="outline" onPress={() => { stop.current = true; setState('idle'); }} />
      </Screen>
    );
  }

  return (
    <Screen title="Abonnement" subtitle="Votre boutique est visible par tous les clients YAKO tant que l'abonnement est actif.">
      {plans.loading ? <ActivityIndicator color={colors.primary} /> : null}
      {plans.data?.data.map((p) => {
        const active = p.plan === plan;
        return (
          <Pressable key={p.plan} onPress={() => setPlan(p.plan)} style={[styles.plan, active && styles.active]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{p.label}</Text>
              <Text style={styles.small}>{PLAN_INFO[p.plan] ?? `${p.months} mois`}</Text>
            </View>
            <Text style={styles.price}>{p.amount.toLocaleString('fr-FR')} <Text style={{ fontSize: 12 }}>FCFA</Text></Text>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.primary : colors.textMuted} style={{ marginLeft: 8 }} />
          </Pressable>
        );
      })}
      <View style={styles.perks}>
        {['Boutique en ligne avec votre logo', 'Produits illimités', 'Livraison par des livreurs vérifiés', 'Tableau de bord des ventes'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <Ionicons name="checkmark" size={16} color={colors.success} /><Text style={{ color: colors.text }}>{t}</Text>
          </View>
        ))}
      </View>
      <PaymentMethods value={network} onChange={(m) => m !== 'CASH' && setNetwork(m)} hideCash />
      <Input label="Numéro Mobile Money" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01 97 00 00 00" />
      <Button title="Payer et activer" onPress={pay} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  plan: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  active: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  price: { fontSize: 18, fontWeight: '800', color: colors.text },
  perks: { backgroundColor: '#FAFAFA', borderRadius: radius.md, padding: 14, marginVertical: 12 },
});
