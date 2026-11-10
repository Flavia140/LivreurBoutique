import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { appendImage, type MerchantState } from '@/lib/merchant';
import type { Product } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { colors, radius } from '@/theme';

/** Ajout ou modification d'un produit : photo, prix, promotion, stock, catégorie. */
export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useApi<{ data: Product }>(isNew ? null : `/merchant/products/${id}`);
  const state = useApi<{ data: MerchantState }>('/merchant/shop');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [promo, setPromo] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [image, setImage] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const [newCat, setNewCat] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCategories(state.data?.data.shop?.categories ?? []); }, [state.data]);
  useEffect(() => {
    const p = existing.data?.data;
    if (!p) return;
    setName(p.name); setDescription(p.description ?? ''); setPrice(String(p.price));
    setPromo(p.promo_price ? String(p.promo_price) : ''); setStock(p.stock === null ? '' : String(p.stock));
    setCategoryId(p.category_id); setActive(p.active);
  }, [existing.data]);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!res.canceled) setImage(res.assets[0]);
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const res = await api<{ data: { id: number; name: string } }>('/merchant/categories', { method: 'POST', body: { name: newCat.trim() } });
      setCategories((c) => [...c, res.data]);
      setCategoryId(res.data.id);
      setNewCat('');
    } catch (e) { Alert.alert('Catégorie', errorMessage(e)); }
  };

  const save = async () => {
    const p = parseInt(price, 10);
    if (!name.trim() || !p) return Alert.alert('Champs manquants', 'Le nom et le prix sont obligatoires.');
    if (promo && parseInt(promo, 10) >= p) return Alert.alert('Prix promo', 'Le prix promo doit être inférieur au prix normal.');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('description', description);
      form.append('price', String(p));
      if (promo) form.append('promo_price', promo); else form.append('promo_price', '');
      if (stock) form.append('stock', stock); else form.append('stock', '');
      if (categoryId) form.append('product_category_id', String(categoryId));
      form.append('active', active ? '1' : '0');
      if (image) await appendImage(form, 'image', image);
      await api(isNew ? '/merchant/products' : `/merchant/products/${id}`, { method: 'POST', form });
      router.back();
    } catch (e) {
      Alert.alert('Enregistrement impossible', errorMessage(e));
    } finally { setBusy(false); }
  };

  const remove = () => Alert.alert('Retirer ce produit ?', 'Il ne sera plus visible. Les commandes passées sont conservées.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Retirer', style: 'destructive', onPress: async () => {
      try { await api(`/merchant/products/${id}`, { method: 'DELETE' }); router.back(); } catch (e) { Alert.alert('Erreur', errorMessage(e)); }
    } },
  ]);

  const imageUri = image?.uri ?? existing.data?.data.image_url;

  return (
    <Screen title={isNew ? 'Nouveau produit' : 'Modifier le produit'}>
      <Pressable style={styles.photo} onPress={pick} accessibilityLabel="Choisir une photo">
        {imageUri ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} /> : <><Ionicons name="camera-outline" size={28} color={colors.primary} /><Text style={styles.small}>Ajouter une photo</Text></>}
      </Pressable>
      <Input label="Nom du produit" value={name} onChangeText={setName} placeholder="Ex. Riz parfumé 5 kg" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Input label="Prix (FCFA)" value={price} onChangeText={setPrice} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Input label="Prix promo (facultatif)" value={promo} onChangeText={setPromo} keyboardType="number-pad" /></View>
      </View>
      <Input label="Stock (vide = illimité)" value={stock} onChangeText={setStock} keyboardType="number-pad" />
      <Input label="Description (facultatif)" value={description} onChangeText={setDescription} multiline style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }} />

      <Text style={styles.label}>Catégorie</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {categories.map((c) => (
          <Pressable key={c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} style={[styles.chip, categoryId === c.id && styles.chipActive]}>
            <Text style={{ color: categoryId === c.id ? colors.primary : colors.text }}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><Input value={newCat} onChangeText={setNewCat} placeholder="Nouvelle catégorie" /></View>
        <Button title="Ajouter" variant="outline" onPress={addCategory} style={{ width: 100 }} />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600' }}>Visible dans la boutique</Text>
          <Text style={styles.small}>Désactivez pour masquer le produit sans le supprimer.</Text>
        </View>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
      </View>

      <Button title="Enregistrer" onPress={save} loading={busy} style={{ marginTop: 16 }} />
      {!isNew ? <Button title="Retirer le produit" variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { height: 160, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16, gap: 6 },
  small: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border },
});
