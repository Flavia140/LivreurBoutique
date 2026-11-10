export const fcfa = (n: number) => `${n.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;

export const ORDER_STATUS: Record<string, string> = {
  awaiting_payment: 'En attente de paiement',
  pending_confirmation: 'En attente de la boutique',
  confirmed: 'Préparation en cours',
  in_delivery: 'En cours de livraison',
  delivered: 'Livrée',
  rejected: 'Refusée par la boutique',
  cancelled: 'Annulée',
};

export const DELIVERY_STATUS: Record<string, string> = {
  awaiting_payment: 'En attente de paiement',
  awaiting_merchant: 'En attente de la boutique',
  pending: 'Recherche d\'un livreur',
  accepted: 'Livreur en route',
  in_progress: 'En cours de livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};
