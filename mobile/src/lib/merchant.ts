import type { Shop } from './types';

export type MerchantState = {
  shop: Shop | null;
  application_status: 'pending' | 'approved' | 'rejected' | null;
  subscription: { plan: string; ends_at: string } | null;
  templates: string[];
};

export const TEMPLATES: { key: Shop['template']; label: string; text: string; color: string; icon: string }[] = [
  { key: 'general', label: 'Général', text: 'Mise en page simple pour tous les commerces', color: '#FF6B00', icon: 'storefront-outline' },
  { key: 'alimentation', label: 'Alimentation', text: 'Produits frais, épicerie, restaurants', color: '#2E7D32', icon: 'nutrition-outline' },
  { key: 'mode', label: 'Mode', text: 'Vêtements, chaussures, accessoires', color: '#6A1B9A', icon: 'shirt-outline' },
  { key: 'electronique', label: 'Électronique', text: 'Téléphones, accessoires, high-tech', color: '#1565C0', icon: 'phone-portrait-outline' },
];

export const SWATCHES = ['#FF6B00', '#C62828', '#2E7D32', '#1565C0', '#6A1B9A', '#00838F', '#F9A825', '#37474F'];

export const SHOP_STATUS: Record<string, string> = {
  draft: 'Brouillon : pas encore visible',
  pending_review: "En cours de vérification par l'équipe YAKO",
  live: 'En ligne',
  suspended: 'Suspendue',
};

export const PLAN_INFO: Record<string, string> = {
  monthly: 'Idéal pour démarrer',
  quarterly: 'Économisez 16 %',
  annual: 'Économisez 24 %, le meilleur prix',
};

/** Ajoute une image choisie au formulaire (sur le web, l'URI doit être convertie en Blob). */
export async function appendImage(form: FormData, field: string, asset: { uri: string; mimeType?: string | null }) {
  const { Platform } = await import('react-native');
  if (Platform.OS === 'web') {
    const blob = await (await fetch(asset.uri)).blob();
    form.append(field, blob, `${field}.jpg`);
  } else {
    form.append(field, { uri: asset.uri, name: `${field}.jpg`, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
  }
}
