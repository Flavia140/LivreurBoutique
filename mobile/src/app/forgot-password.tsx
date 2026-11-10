import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PhoneOtpFields } from '@/components/PhoneOtpFields';
import { Screen } from '@/components/Screen';
import { api, errorMessage } from '@/lib/api';
import { normalizeBeninPhone } from '@/lib/phone';

export default function ForgotPassword() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api('/auth/password/reset', { method: 'POST', body: { phone: normalizeBeninPhone(phone), code, password, password_confirmation: confirm } });
      Alert.alert('Mot de passe modifié', 'Vous pouvez maintenant vous connecter.');
      router.replace('/login');
    } catch (e) {
      Alert.alert('Erreur', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Mot de passe oublié" subtitle="Nous allons vous envoyer un code par SMS.">
      <PhoneOtpFields purpose="reset" phone={phone} code={code} onPhone={setPhone} onCode={setCode} />
      <Input label="Nouveau mot de passe" secure value={password} onChangeText={setPassword} placeholder="8 caractères minimum" />
      <Input label="Confirmer le mot de passe" secure value={confirm} onChangeText={setConfirm} />
      <Button title="Valider" onPress={submit} loading={loading} disabled={code.length !== 6 || password.length < 8} />
    </Screen>
  );
}
