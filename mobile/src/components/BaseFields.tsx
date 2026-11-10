import { Input } from './Input';
import { PhoneOtpFields } from './PhoneOtpFields';

type Base = { first_name: string; last_name: string; phone: string; code: string; password: string; password_confirmation: string };

export function BaseFields({ base, set }: { base: Base; set: (k: keyof Base) => (v: string) => void }) {
  const mismatch = base.password_confirmation.length > 0 && base.password !== base.password_confirmation;
  return (
    <>
      <Input label="Prénom" value={base.first_name} onChangeText={set('first_name')} autoComplete="given-name" />
      <Input label="Nom" value={base.last_name} onChangeText={set('last_name')} autoComplete="family-name" />
      <PhoneOtpFields purpose="register" phone={base.phone} code={base.code} onPhone={set('phone')} onCode={set('code')} />
      <Input label="Mot de passe" secure placeholder="8 caractères minimum" value={base.password} onChangeText={set('password')} />
      <Input label="Confirmer le mot de passe" secure value={base.password_confirmation} onChangeText={set('password_confirmation')} error={mismatch ? 'Les mots de passe ne correspondent pas.' : undefined} />
    </>
  );
}
