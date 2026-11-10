import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

/** Profil livreur (maquette livreur 5). La photo ne change qu'avec l'accord de l'équipe. */
export default function CourierProfile() {
  const { user, signOut } = useAuth();
  const c = user?.courier;
  return (
    <Screen back={false}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={styles.avatar}><Text style={styles.initial}>{user?.first_name?.[0]}</Text></View>
        <Text style={styles.name}>{user?.first_name} {user?.last_name?.[0]}.</Text>
        {c?.verified ? <View style={styles.badge}><Ionicons name="checkmark-circle" size={14} color={colors.success} /><Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>Étudiant vérifié</Text></View> : null}
      </View>
      <Field label="Université" value={c?.university} />
      <Field label="Matricule" value={c?.student_number} />
      <Field label="Niveau d'étude" value={c?.study_level} />
      <Field label="Moyen de transport" value={c?.vehicle_type === 'voiture' ? 'Voiture' : 'Moto'} />
      <Field label="Plaque" value={c?.plate_number} />
      <Field label="Permis de conduire" value={c?.verified ? 'Vérifié' : 'En attente'} />
      <Text style={{ marginTop: 12, color: colors.text }}>★ {c?.rating_avg?.toFixed(1) ?? '–'} ({c?.rating_count ?? 0} évaluations)</Text>
      <Button title="Se déconnecter" variant="outline" style={{ marginTop: 24 }} onPress={async () => { await signOut(); router.replace('/login'); }} />
    </Screen>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.text, marginTop: 2 }}>{value || '–'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 36, fontWeight: '800', color: colors.primary },
  name: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  field: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
