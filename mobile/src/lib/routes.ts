import type { Href } from 'expo-router';
import type { User } from './api';

/** Écran d'arrivée selon le profil. */
export function homeFor(user: User): Href {
  if (user.role === 'courier') return user.courier?.verified ? '/home' : '/courier/documents';
  if (user.role === 'client') return '/client';
  return '/home';
}
