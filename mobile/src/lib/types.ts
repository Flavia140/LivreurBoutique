export type Shop = {
  id: number;
  name: string;
  category: string;
  template: 'general' | 'mode' | 'alimentation' | 'electronique';
  color: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  zone: { id: number; name: string; city: string } | null;
  address: string;
  delivery_estimate: [number, number];
  rating_avg: number | null;
  rating_count: number;
  status: string;
  categories?: { id: number; name: string }[];
};

export type Product = {
  id: number;
  shop_id: number;
  shop?: { id: number; name: string; color: string };
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  current_price: number;
  stock: number | null;
  available: boolean;
  active: boolean;
  image_url: string | null;
  sold_count: number;
};

export type DeliveryStatus = 'awaiting_payment' | 'awaiting_merchant' | 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'cancelled';

export type Delivery = {
  id: number;
  code: string;
  status: DeliveryStatus;
  pickup: { zone: { id: number; name: string; city: string } | null; address: string; contact_phone: string | null };
  dropoff: { zone: { id: number; name: string; city: string } | null; address: string; recipient_name: string | null; recipient_phone: string };
  parcel_type: string;
  notes?: string | null;
  price: number;
  commission: number;
  total: number;
  payment_method: 'mobile_money' | 'cash';
  cash_to_collect: number;
  goods_amount: number;
  confirmation_code?: string;
  courier: { id: number; first_name: string; phone?: string; vehicle_type?: string; rating_avg?: number | null; verified: boolean } | null;
  courier_position?: { lat: number; lng: number; at: string };
  order_id: number | null;
  rated: boolean;
  rating?: { score: number; comment: string | null } | null;
  created_at: string;
  accepted_at: string | null;
  arrived_pickup_at?: string | null;
  picked_up_at: string | null;
  arrived_dropoff_at?: string | null;
  delivered_at: string | null;
};

export type Order = {
  id: number;
  code: string;
  status: 'awaiting_payment' | 'pending_confirmation' | 'confirmed' | 'in_delivery' | 'delivered' | 'rejected' | 'cancelled';
  shop: { id: number; name: string; color: string };
  items: { product_id: number; name: string; unit_price: number; quantity: number; line_total: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  rejection_reason: string | null;
  rated: boolean;
  client?: { first_name: string; last_name: string; phone: string };
  delivery: Delivery | null;
  created_at: string;
};

export type Paginated<T> = { data: T[]; meta?: { current_page: number; last_page: number } };
