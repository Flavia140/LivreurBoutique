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
  const [studentNumber, setStudentNumber] = useState('');
  const [level, setLevel] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<'moto' | 'voiture' | null>(null);
  const [plate, setPlate] = useState('');
  const [zone, setZone] = useState<Zone | null>(null);

  return (
    <Screen title="Inscription livreur" subtitle="Réservé aux étudiants. Votre dossier sera vérifié par l'équipe YAKO.">
      <BaseFields base={base} set={set} />
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Informations étudiant</Text>
      <Input label="Université ou école" placeholder="Ex : UAC, EPAC, ESAE…" value={university} onChangeText={setUniversity} />
      <Input label="Matricule étudiant" autoCapitalize="characters" value={studentNumber} onChangeText={setStudentNumber} />
      <Choice label="Niveau d'étude" value={level} onChange={setLevel} options={['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2', 'Doctorat', 'Autre'].map((v) => ({ value: v, label: v }))} />
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Véhicule</Text>
      <Choice label="Type de véhicule" value={vehicle} onChange={setVehicle} options={[{ value: 'moto', label: 'Moto' }, { value: 'voiture', label: 'Voiture' }]} />
      <Input label="Immatriculation" autoCapitalize="characters" value={plate} onChangeText={setPlate} />
      <ZonePicker label="Zone où vous livrez" value={zone} onChange={setZone} />
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
        À l'étape suivante, vous déposerez vos 7 documents : carte d'étudiant, pièce d'identité, permis, carte grise, assurance, photo du véhicule et photo de profil.
      </Text>
      <Button
        title="Continuer"
        loading={loading}
        disabled={!baseReady || !university || !studentNumber || !level || !vehicle || !plate || !zone}
        onPress={() => submit({ university, student_number: studentNumber, study_level: level, vehicle_type: vehicle, plate_number: plate, zone_id: zone?.id })}
      />
    </Screen>
  );
}
