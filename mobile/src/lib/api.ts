import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from './storage';

// 10.0.2.2 = la machine hôte vue depuis l'émulateur Android. À remplacer par l'URL de production.
const configured = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? 'http://10.0.2.2:8000/api/v1';
const API_URL: string = Platform.OS === 'web' ? configured.replace('10.0.2.2', 'localhost') : configured;
const TOKEN_KEY = 'yako.token';

export type Role = 'client' | 'courier' | 'merchant' | 'admin';

export type User = {
  id: number;
  first_name: string;
  last_name: string | null;
  phone: string;
  email: string | null;
  role: Role;
  status: 'active' | 'suspended';
  zone?: { id: number; name: string; city: string } | null;
  courier?: {
    validation_status: 'pending' | 'approved' | 'rejected';
    verified: boolean;
    vehicle_type: 'moto' | 'voiture';
    available: boolean;
    missing_documents: string[];
  } | null;
  merchant?: { business_name: string; category: string; status: 'pending' | 'approved' | 'rejected' } | null;
};

export type Zone = { id: number; name: string; city: string; department: string | null; parent_id: number | null };

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public fields?: Record<string, string[]>) {
    super(message);
  }
}

export async function getToken() {
  return storage.get(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await storage.set(TOKEN_KEY, token);
  else await storage.remove(TOKEN_KEY);
}

type Options = { method?: string; body?: unknown; form?: FormData };

export async function api<T = any>(path: string, { method = 'GET', body, form }: Options = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre accès internet.', 0, 'network');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message ?? 'Une erreur est survenue.', res.status, data.code, data.errors);
  }
  return data as T;
}

/** Premier message d'erreur à afficher, champ par champ si le serveur en donne. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const first = e.fields ? Object.values(e.fields)[0]?.[0] : undefined;
    return first ?? e.message;
  }
  return 'Une erreur est survenue.';
}
