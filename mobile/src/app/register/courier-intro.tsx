import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'react-native';
import { colors, radius } from '@/theme';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'cash-outline', text: "Gagne de l'argent" },
  { icon: 'time-outline', text: 'Travaille à ton rythme' },
  { icon: 'shield-checkmark-outline', text: 'Horaires sécurisés\n7h00 – 21h00' },
];

/** Inscription livreur, écran d'accueil (maquette livreur 1). */
export default function CourierIntro() {
  return (
    <SafeAreaView style={styles.root}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 16 }}><Ionicons name="chevron-back" size={26} color="#fff" /></Pressable>
      <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
        <Image source={require('../../../assets/images/logo.png')} style={{ width: 72, height: 72, borderRadius: 16 }} />
        <Text style={styles.title}>Deviens livreur étudiant avec Yako</Text>
      </View>
      <View style={{ paddingHorizontal: 32, marginTop: 32, gap: 24 }}>
        {POINTS.map((p) => (
          <View key={p.text} style={styles.point}>
            <View style={styles.icon}><Ionicons name={p.icon} size={20} color="#fff" /></View>
            <Text style={styles.pointText}>{p.text}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.cta} onPress={() => router.push('/register/courier')}>
        <Text style={styles.ctaText}>Commencer</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pointText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cta: { backgroundColor: '#fff', margin: 24, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
