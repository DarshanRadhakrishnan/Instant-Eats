/**
 * Shared Event Types
 * Define event schemas for RabbitMQ messaging
 */

export namespace OrderEvents {
  export interface OrderCreatedEvent {
    eventType: 'order.created';
    orderId: string;
    customerId: string;
    restaurantId: string;
    deliveryCity: string;
    totalAmount: number;
    estimatedDeliveryTime: number;
    timestamp: Date;
  }

  export interface OrderAssignedEvent {
    eventType: 'order.assigned';
    orderId: string;
    deliveryPartnerId: string;
    estimatedPickupTime: number;
    timestamp: Date;
  }

  export interface OrderStatusUpdatedEvent {
    eventType: 'order.status.updated';
    orderId: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
    updatedAt: Date;
  }

  export interface DeliveryLocationUpdatedEvent {
    eventType: 'delivery.location.updated';
    orderId: string;
    deliveryPartnerId: string;
    latitude: number;
    longitude: number;
    updatedAt: Date;
  }

  export interface OrderCancelledEvent {
    eventType: 'order.cancelled';
    orderId: string;
    customerId: string;
    restaurantId: string;
    refundAmount: number;
    cancelledBy: string;
    reason: string;
    timestamp: Date;
  }
}

export type OrderEvent = 
  | OrderEvents.OrderCreatedEvent 
  | OrderEvents.OrderAssignedEvent 
  | OrderEvents.OrderStatusUpdatedEvent 
  | OrderEvents.DeliveryLocationUpdatedEvent
  | OrderEvents.OrderCancelledEvent;

export namespace RestaurantEvents {
  export interface RestaurantCreatedEvent {
    eventType: 'restaurant.created';
    restaurantId: string;
    name: string;
    city: string;
    timestamp: Date;
  }

  export interface RestaurantUpdatedEvent {
    eventType: 'restaurant.updated';
    restaurantId: string;
    updatedFields: Record<string, any>;
    timestamp: Date;
  }
}

export type RestaurantEvent = 
  | RestaurantEvents.RestaurantCreatedEvent 
  | RestaurantEvents.RestaurantUpdatedEvent;
