import { Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

/** Aiguillage après connexion selon le profil (l'administration se fait sur le back-office web). */
export default function Home() {
  const { user, signOut } = useAuth();
  if (user?.role === 'client') return <Redirect href="/client" />;
  if (user?.role === 'merchant') return <Redirect href="/merchant" />;
  if (user?.role === 'courier') return <Redirect href={user.courier?.verified ? '/courier' : '/courier/documents'} />;

  return (
    <Screen title={`Bonjour ${user?.first_name ?? ''}`} back={false} subtitle="Ce compte se gère depuis le back-office YAKO.">
      <Text style={{ color: colors.textMuted, marginBottom: 24 }}>Profil : {user?.role}</Text>
      <Button title="Se déconnecter" variant="outline" onPress={async () => { await signOut(); router.replace('/login'); }} />
    </Screen>
  );
}
