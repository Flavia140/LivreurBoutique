import { useState } from 'react';
import { BaseFields } from '@/components/BaseFields';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ZonePicker } from '@/components/ZonePicker';
import type { Zone } from '@/lib/api';
import { useRegister } from '@/lib/useRegister';

export default function RegisterClient() {
  const { base, set, submit, loading, baseReady } = useRegister('client');
  const [zone, setZone] = useState<Zone | null>(null);
  const [address, setAddress] = useState('');

  return (
    <Screen title="Inscription client" subtitle="Commandez et faites-vous livrer partout au Bénin.">
      <BaseFields base={base} set={set} />
      <ZonePicker label="Votre quartier" value={zone} onChange={setZone} />
      <Input label="Adresse ou repère" placeholder="Ex : maison bleue après la pharmacie" value={address} onChangeText={setAddress} />
      <Button title="Créer mon compte" loading={loading} disabled={!baseReady || !zone || !address} onPress={() => submit({ zone_id: zone?.id, address })} />
    </Screen>
  );
}
