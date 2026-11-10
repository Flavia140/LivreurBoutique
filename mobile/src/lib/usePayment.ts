import { useRef, useState } from 'react';
import { api, errorMessage } from './api';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lance un paiement Mobile Money et attend la confirmation (validation sur le téléphone du client). */
export function usePayment() {
  const [state, setState] = useState<'idle' | 'starting' | 'waiting' | 'paid' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const pay = async (deliveryId: number, network: 'MTN' | 'MOOV', phone: string): Promise<boolean> => {
    cancelled.current = false;
    setError(null);
    setState('starting');
    try {
      await api(`/deliveries/${deliveryId}/pay`, { method: 'POST', body: { network, phone } });
    } catch (e) {
      setError(errorMessage(e));
      setState('failed');
      return false;
    }
    setState('waiting');
    for (let i = 0; i < 60 && !cancelled.current; i++) {
      await sleep(3000);
      try {
        const res = await api<{ data: { delivery_status: string; payment_status: string | null } }>(`/deliveries/${deliveryId}/payment`);
        if (res.data.delivery_status !== 'awaiting_payment') { setState('paid'); return true; }
        if (res.data.payment_status === 'failed') { setError('Paiement refusé ou annulé.'); setState('failed'); return false; }
      } catch { /* réseau instable : on réessaie */ }
    }
    if (!cancelled.current) { setError("Nous n'avons pas reçu la confirmation. Réessayez."); setState('failed'); }
    return false;
  };

  return { pay, state, error, stop: () => { cancelled.current = true; setState('idle'); } };
}
