import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { api, errorMessage, type User } from './api';
import { useAuth } from './auth';
import { normalizeBeninPhone } from './phone';
import { homeFor } from './routes';

/** Champs communs aux trois inscriptions et envoi au serveur. */
export function useRegister(path: 'client' | 'courier' | 'merchant') {
  const { signIn } = useAuth();
  const [base, setBase] = useState({ first_name: '', last_name: '', phone: '', code: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof base) => (v: string) => setBase((b) => ({ ...b, [key]: v }));

  const submit = async (extra: Record<string, unknown>, form?: FormData) => {
    setLoading(true);
    try {
      const payload = { ...base, phone: normalizeBeninPhone(base.phone), ...extra };
      let res: { token: string; user: User };
      if (form) {
        Object.entries(payload).forEach(([k, v]) => v !== undefined && v !== null && form.append(k, String(v)));
        res = await api(`/auth/register/${path}`, { method: 'POST', form });
      } else {
        res = await api(`/auth/register/${path}`, { method: 'POST', body: payload });
      }
      await signIn(res.token, res.user);
      router.replace(homeFor(res.user));
    } catch (e) {
      Alert.alert('Inscription impossible', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const baseReady = base.first_name && base.last_name && base.code.length === 6 && base.password.length >= 8 && base.password === base.password_confirmation;

  return { base, set, submit, loading, baseReady: Boolean(baseReady) };
}
