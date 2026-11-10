import { Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

/** Accueil provisoire : remplacé par les écrans client, livreur et commerçant dans la suite. */
export default function Home() {
  const { user, signOut } = useAuth();
  if (user?.role === 'client') return <Redirect href="/client" />;
  const pendingMerchant = user?.role === 'merchant' && user.merchant?.status !== 'approved';

  return (
    <Screen title={`Bonjour ${user?.first_name ?? ''}`} back={false}
      subtitle={pendingMerchant ? `Votre demande pour « ${user?.merchant?.business_name} » est en cours d'examen. Nous vous contacterons pour l'abonnement.` : 'Bienvenue sur YAKO.'}>
      <Text style={{ color: colors.textMuted, marginBottom: 24 }}>Profil : {user?.role}</Text>
      <Button title="Se déconnecter" variant="outline" onPress={async () => { await signOut(); router.replace('/login'); }} />
    </Screen>
  );
}
