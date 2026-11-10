import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Screen } from '@/components/Screen';
import { colors, radius } from '@/theme';

const PROFILES: { href: Href; icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { href: '/register/client', icon: 'bag-handle-outline', title: 'Client', text: 'Je commande dans les boutiques ou je fais livrer un colis.' },
  { href: '/register/courier', icon: 'bicycle-outline', title: 'Livreur étudiant', text: 'Je livre à moto ou en voiture et je gagne un revenu.' },
  { href: '/register/merchant', icon: 'storefront-outline', title: 'Commerçant', text: "J'ouvre ma boutique en ligne sur YAKO." },
];

/** Choix du profil avant l'inscription. */
export default function ChooseProfile() {
  return (
    <Screen title="Créer un compte" subtitle="Qui êtes-vous ?">
      {PROFILES.map((p) => (
        <Pressable key={p.title} style={({ pressed }) => [styles.card, pressed && { borderColor: colors.primary }]} onPress={() => router.push(p.href)}>
          <View style={styles.icon}><Ionicons name={p.icon} size={26} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.text}>{p.text}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  text: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
