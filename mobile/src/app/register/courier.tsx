import { useState } from 'react';
import { Text } from 'react-native';
import { BaseFields } from '@/components/BaseFields';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { ZonePicker } from '@/components/ZonePicker';
import type { Zone } from '@/lib/api';
import { useRegister } from '@/lib/useRegister';
import { colors } from '@/theme';

export default function RegisterCourier() {
  const { base, set, submit, loading, baseReady } = useRegister('courier');
  const [university, setUniversity] = useState('');
  const [vehicle, setVehicle] = useState<'moto' | 'voiture' | null>(null);
  const [plate, setPlate] = useState('');
  const [zone, setZone] = useState<Zone | null>(null);

  return (
    <Screen title="Inscription livreur" subtitle="Réservé aux étudiants. Votre dossier sera vérifié par l'équipe YAKO.">
      <BaseFields base={base} set={set} />
      <Input label="Université ou école" placeholder="Ex : UAC, ENEAM…" value={university} onChangeText={setUniversity} />
      <Choice label="Véhicule" value={vehicle} onChange={setVehicle} options={[{ value: 'moto', label: 'Moto' }, { value: 'voiture', label: 'Voiture' }]} />
      <Input label="Immatriculation" autoCapitalize="characters" value={plate} onChangeText={setPlate} />
      <ZonePicker label="Zone où vous livrez" value={zone} onChange={setZone} />
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
        À l'étape suivante, vous déposerez vos 7 documents : carte d'étudiant, pièce d'identité, permis, carte grise, assurance, photo du véhicule et photo de profil.
      </Text>
      <Button
        title="Continuer"
        loading={loading}
        disabled={!baseReady || !university || !vehicle || !plate || !zone}
        onPress={() => submit({ university, vehicle_type: vehicle, plate_number: plate, zone_id: zone?.id })}
      />
    </Screen>
  );
}
