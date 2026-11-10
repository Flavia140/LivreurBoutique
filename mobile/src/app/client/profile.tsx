import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { colors, radius } from '@/theme';

export default function ClientProfile() {
  const { user, signOut } = useAuth();
  const { city } = useCity();
  return (
    <Screen title="Mon profil" back={false}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        <Text style={styles.sub}>{user?.phone}</Text>
        {user?.zone ? <Text style={styles.sub}>{user.zone.name}, {user.zone.city}</Text> : null}
      </View>
      <Pressable style={styles.row} onPress={() => router.push('/city')}>
        <Ionicons name="location-outline" size={20} color={colors.text} />
        <Text style={{ flex: 1 }}>Ville : {city}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
      <Button title="Se déconnecter" variant="outline" style={{ marginTop: 24 }} onPress={async () => { await signOut(); router.replace('/login'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 16, marginBottom: 16 },
  name: { fontSize: 18, fontWeight: '700' },
  sub: { color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
