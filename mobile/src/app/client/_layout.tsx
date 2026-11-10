import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function ClientTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="orders" options={{ title: 'Commandes', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="send" options={{ title: 'Envoyer', tabBarIcon: icon('cube-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
