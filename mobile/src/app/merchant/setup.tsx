import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { appendImage, SWATCHES, TEMPLATES, type MerchantState } from '@/lib/merchant';
import type { Shop } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

type Picked = { uri: string; mimeType?: string | null } | null;

/** Création / personnalisation de la boutique : modèle, couleur, logo, bannière, description. */
export default function ShopSetup() {
  const { user } = useAuth();
  const state = useApi<{ data: MerchantState }>('/merchant/shop');
  const shop = state.data?.data.shop ?? null;
  const [name, setName] = useState(user?.merchant?.business_name ?? '');
  const [template, setTemplate] = useState<Shop['template']>('general');
  const [color, setColor] = useState(TEMPLATES[0].color);
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<Picked>(null);
  const [banner, setBanner] = useState<Picked>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shop) { if (!name && user?.merchant?.business_name) setName(user.merchant.business_name); return; }
    setName(shop.name); setTemplate(shop.template); setColor(shop.color); setDescription(shop.description ?? '');
  }, [shop?.id, user?.merchant?.business_name]);

  const pick = async (set: (p: Picked) => void, aspect: [number, number]) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7 });
    if (!res.canceled) set(res.assets[0]);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Nom manquant', 'Donnez un nom à votre boutique.');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('template', template);
      form.append('color', color);
      form.append('description', description);
      if (logo) await appendImage(form, 'logo', logo);
      if (banner) await appendImage(form, 'banner', banner);
      await api('/merchant/shop', { method: 'POST', form });
      router.replace(shop ? '/merchant/shop' : '/merchant/products');
    } catch (e) {
      Alert.alert('Enregistrement impossible', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const logoUri = logo?.uri ?? shop?.logo_url;
  const bannerUri = banner?.uri ?? shop?.banner_url;

  return (
    <Screen title={shop ? 'Ma boutique' : 'Créer ma boutique'} subtitle="Choisissez un modèle, ajoutez votre logo : YAKO s'occupe de la mise en page.">
      <Text style={styles.section}>1. Modèle</Text>
      <View style={styles.grid}>
        {TEMPLATES.map((t) => {
          const active = t.key === template;
          return (
            <Pressable key={t.key} style={[styles.tpl, active && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
              onPress={() => { setTemplate(t.key); if (!shop) setColor(t.color); }}>
              <View style={[styles.tplIcon, { backgroundColor: t.color }]}><Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={20} color="#fff" /></View>
              <Text style={styles.tplLabel}>{t.label}</Text>
              <Text style={styles.small}>{t.text}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>2. Couleur</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        {SWATCHES.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Couleur ${c}`}
            style={[styles.swatch, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: colors.text }]} />
        ))}
      </View>

      <Text style={styles.section}>3. Identité</Text>
      <Input label="Nom de la boutique" value={name} onChangeText={setName} />
      <Input label="Description (facultatif)" value={description} onChangeText={setDescription} multiline style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }} placeholder="Ce que vous vendez, vos points forts…" />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <Pressable style={[styles.upload, { width: 96 }]} onPress={() => pick(setLogo, [1, 1])}>
          {logoUri ? <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} /> : <><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.small}>Logo</Text></>}
        </Pressable>
        <Pressable style={[styles.upload, { flex: 1 }]} onPress={() => pick(setBanner, [16, 9])}>
          {bannerUri ? <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} /> : <><Ionicons name="images-outline" size={24} color={colors.primary} /><Text style={styles.small}>Bannière (facultatif)</Text></>}
        </Pressable>
      </View>

      <Text style={styles.section}>Aperçu</Text>
      <View style={styles.preview}>
        <View style={[styles.previewBanner, { backgroundColor: color }]}>
          {bannerUri ? <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
          <View style={[styles.previewLogo, { borderColor: color }]}>
            {logoUri ? <Image source={{ uri: logoUri }} style={StyleSheet.absoluteFill} /> : <Text style={{ color, fontWeight: '800', fontSize: 18 }}>{name.slice(0, 1).toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>{name || 'Ma boutique'}</Text>
            <Text style={styles.small}>{TEMPLATES.find((t) => t.key === template)?.label} · {user?.zone?.name ?? 'Cotonou'}</Text>
          </View>
        </View>
      </View>

      <Button title={shop ? 'Enregistrer' : 'Créer la boutique'} onPress={save} loading={busy} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 10 },
  small: { fontSize: 12, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  tpl: { width: '48%', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, flexGrow: 1 },
  tplIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tplLabel: { fontWeight: '700', color: colors.text, marginBottom: 2 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  upload: { height: 96, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4 },
  preview: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  previewBanner: { height: 90 },
  previewLogo: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: -30 },
});
