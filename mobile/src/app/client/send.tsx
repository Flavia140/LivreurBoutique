import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ZonePicker } from '@/components/ZonePicker';
import { api, errorMessage, type Zone } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { normalizeBeninPhone } from '@/lib/phone';
import type { Delivery } from '@/lib/types';
import { colors } from '@/theme';

type Parcel = 'document' | 'food' | 'clothes' | 'other';

/** Envoi d'un colis sans boutique (cahier des charges 3.B). */
export default function SendParcel() {
  const [from, setFrom] = useState<Zone | null>(null);
  const [to, setTo] = useState<Zone | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [type, setType] = useState<Parcel | null>(null);
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuote(null); setQuoteError(null);
    if (!from || !to) return;
    api<{ data: { total: number } }>(`/tariffs/quote?from=${from.id}&to=${to.id}`).then((r) => setQuote(r.data.total)).catch((e) => setQuoteError(errorMessage(e)));
  }, [from, to]);

  const submit = async () => {
    setLoading(true);
    try {
      const d = (await api<{ data: Delivery }>('/deliveries', { method: 'POST', body: {
        pickup_zone_id: from!.id, pickup_address: pickup, dropoff_zone_id: to!.id, dropoff_address: dropoff,
        recipient_name: recipient || undefined, recipient_phone: normalizeBeninPhone(recipientPhone), parcel_type: type, notes: notes.trim() || undefined,
      } })).data;
      router.push({ pathname: '/checkout/payment', params: { deliveryId: String(d.id), total: String(d.total) } });
    } catch (e) {
      Alert.alert('Envoi impossible', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Envoyer un colis" subtitle="Un livreur étudiant récupère votre colis et le remet au destinataire." back={false}>
      <ZonePicker label="Quartier de prise en charge" value={from} onChange={setFrom} />
      <Input label="Adresse de prise en charge" value={pickup} onChangeText={setPickup} />
      <ZonePicker label="Quartier de livraison" value={to} onChange={setTo} />
      <Input label="Adresse de livraison" value={dropoff} onChangeText={setDropoff} />
      <Input label="Nom du destinataire" value={recipient} onChangeText={setRecipient} />
      <Input label="Téléphone du destinataire" keyboardType="phone-pad" value={recipientPhone} onChangeText={setRecipientPhone} />
      <Choice label="Type de colis" value={type} onChange={setType} options={[
        { value: 'document', label: 'Document' }, { value: 'food', label: 'Nourriture' }, { value: 'clothes', label: 'Vêtements' }, { value: 'other', label: 'Autre' },
      ]} />
      <Input label="Description du colis (facultatif)" value={notes} onChangeText={setNotes} maxLength={500} multiline style={{ height: 70, textAlignVertical: 'top', paddingTop: 12 }} placeholder="Ex. enveloppe A4, fragile, à remettre en main propre" />
      {quote !== null ? <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 16 }}>Prix fixe : {fcfa(quote)}</Text> : null}
      {quoteError ? <Text style={{ color: colors.danger, marginBottom: 16 }}>{quoteError}</Text> : null}
      <Button title="Continuer vers le paiement" loading={loading} disabled={!quote || !pickup || !dropoff || !type || recipientPhone.replace(/\D/g, '').length < 8} onPress={submit} />
    </Screen>
  );
}
