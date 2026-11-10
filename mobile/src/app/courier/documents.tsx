import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius } from '@/theme';

const DOCS: { type: string; label: string }[] = [
  { type: 'student_card', label: "Carte d'étudiant valide" },
  { type: 'id_card', label: "Pièce d'identité (CNI ou passeport)" },
  { type: 'license', label: 'Permis de conduire' },
  { type: 'registration', label: 'Carte grise du véhicule' },
  { type: 'insurance', label: 'Assurance en cours de validité' },
  { type: 'vehicle_photo', label: 'Photo du véhicule' },
  { type: 'profile_photo', label: 'Photo de profil récente' },
];

/** Dossier livreur : dépôt des 7 documents, puis attente de validation. */
export default function CourierDocuments() {
  const { user, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const missing = user?.courier?.missing_documents ?? DOCS.map((d) => d.type);
  const status = user?.courier?.validation_status;

  const upload = async (type: string) => {
    const pick = await ImagePicker.launchCameraAsync({ quality: 0.6, cameraType: type === 'profile_photo' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
      .catch(() => ImagePicker.launchImageLibraryAsync({ quality: 0.6 }));
    if (pick.canceled) return;
    const asset = pick.assets[0];
    const form = new FormData();
    form.append('type', type);
    form.append('file', { uri: asset.uri, name: `${type}.jpg`, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
    setBusy(type);
    try {
      await api('/courier/documents', { method: 'POST', form });
      await refresh();
    } catch (e) {
      Alert.alert('Envoi impossible', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const complete = missing.length === 0;

  return (
    <Screen title="Votre dossier livreur" back={false}
      subtitle={complete
        ? status === 'rejected' ? 'Votre dossier a été refusé. Remplacez les documents demandés.' : "Dossier complet. L'équipe YAKO le vérifie ; vous recevrez une notification dès la validation."
        : `Il reste ${missing.length} document(s) à déposer.`}>
      {DOCS.map((d) => {
        const done = !missing.includes(d.type);
        return (
          <Pressable key={d.type} style={styles.row} onPress={() => upload(d.type)} disabled={busy !== null}>
            <Ionicons name={done ? 'checkmark-circle' : 'camera-outline'} size={22} color={done ? colors.success : colors.primary} />
            <Text style={styles.label}>{d.label}</Text>
            <Text style={styles.action}>{busy === d.type ? 'Envoi…' : done ? 'Remplacer' : 'Ajouter'}</Text>
          </Pressable>
        );
      })}
      <View style={{ height: 16 }} />
      {user?.courier?.verified ? <Button title="Accéder à mes missions" onPress={() => router.replace('/home')} /> : <Button title="Actualiser" variant="outline" onPress={refresh} />}
      <Button title="Se déconnecter" variant="ghost" onPress={async () => { await signOut(); router.replace('/login'); }} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  label: { flex: 1, fontSize: 14, color: colors.text },
  action: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
