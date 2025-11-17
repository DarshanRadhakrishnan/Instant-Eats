/**
 * Shared Interfaces and Types
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'customer' | 'restaurant' | 'delivery_partner' | 'admin';
  city: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  deliveryPartnerId?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryAddress: string;
  city: string;
  latitude: number;
  longitude: number;
  estimatedDeliveryTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  email: string;
  ownerUserId: string;
  rating: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryPartner {
  id: string;
  userId: string;
  city: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  currentOrderId?: string;
  totalDeliveries: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  city: string;
  iat: number;
  exp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}
