import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { BaseFields } from '@/components/BaseFields';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ZonePicker } from '@/components/ZonePicker';
import type { Zone } from '@/lib/api';
import { useRegister } from '@/lib/useRegister';
import { colors, radius } from '@/theme';

const CATEGORIES = [
  { value: 'alimentaire', label: 'Alimentaire' }, { value: 'mode', label: 'Mode' }, { value: 'electronique', label: 'Électronique' },
  { value: 'sante', label: 'Santé' }, { value: 'beaute', label: 'Beauté' }, { value: 'maison', label: 'Maison' }, { value: 'autre', label: 'Autre' },
] as const;
type Category = (typeof CATEGORIES)[number]['value'];

export default function RegisterMerchant() {
  const { base, set, submit, loading, baseReady } = useRegister('merchant');
  const [business, setBusiness] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [address, setAddress] = useState('');
  const [ifu, setIfu] = useState('');
  const [rccm, setRccm] = useState('');
  const [docs, setDocs] = useState<DocumentPicker.DocumentPickerAsset[]>([]);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (!res.canceled) setDocs((d) => [...d, ...res.assets].slice(0, 5));
  };

  const send = () => {
    const form = new FormData();
    docs.forEach((d, i) => form.append(`documents[${i}]`, { uri: d.uri, name: d.name, type: d.mimeType ?? 'application/octet-stream' } as unknown as Blob));
    submit({ business_name: business, category, zone_id: zone?.id, address, ifu: ifu || undefined, rccm: rccm || undefined }, form);
  };

  return (
    <Screen title="Inscription commerçant" subtitle="Ouvrez votre boutique sur YAKO. L'équipe valide votre commerce avant la mise en ligne.">
      <Input label="Nom de la boutique" value={business} onChangeText={setBusiness} />
      <Choice label="Catégorie" value={category} onChange={setCategory} options={[...CATEGORIES]} />
      <ZonePicker label="Quartier de la boutique" value={zone} onChange={setZone} />
      <Input label="Adresse" value={address} onChangeText={setAddress} />
      <Input label="IFU (facultatif)" value={ifu} onChangeText={setIfu} />
      <Input label="RCCM (facultatif)" value={rccm} onChangeText={setRccm} />

      <Text style={styles.section}>Responsable</Text>
      <BaseFields base={base} set={set} />

      <Text style={styles.section}>Documents légaux</Text>
      {docs.map((d, i) => (
        <View key={d.uri} style={styles.doc}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={{ flex: 1 }} numberOfLines={1}>{d.name}</Text>
          <Pressable onPress={() => setDocs(docs.filter((_, j) => j !== i))} hitSlop={10}><Ionicons name="close" size={18} color={colors.textMuted} /></Pressable>
        </View>
      ))}
      <Button title="Ajouter un document" variant="outline" onPress={pick} disabled={docs.length >= 5} style={{ marginBottom: 24 }} />

      <Button title="Envoyer ma demande" loading={loading} disabled={!baseReady || !business || !category || !zone || !address} onPress={send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 12 },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 8 },
});
