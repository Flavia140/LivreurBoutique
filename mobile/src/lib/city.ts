import { useEffect, useState } from 'react';
import { storage } from './storage';

const KEY = 'yako.city';

export const getCity = () => storage.get(KEY);
export const setCity = (city: string) => storage.set(KEY, city);

export function useCity() {
  const [city, setState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getCity().then((c) => { setState(c); setReady(true); });
  }, []);
  return { city, ready, setCity: async (c: string) => { await setCity(c); setState(c); } };
}
