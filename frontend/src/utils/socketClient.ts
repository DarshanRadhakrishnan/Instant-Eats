import { io, Socket } from 'socket.io-client';

const TRACKING_URL = import.meta.env.VITE_TRACKING_URL || 'http://localhost:3005';

let socket: Socket | null = null;

export function initializeSocket(): Socket {
  if (!socket) {
    socket = io(TRACKING_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('🔗 Connected to tracking service');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from tracking service');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function subscribeToOrder(orderId: string) {
  const s = initializeSocket();
  s.emit('subscribe-order', orderId);
}

export function unsubscribeFromOrder(orderId: string) {
  if (socket) {
    socket.emit('unsubscribe-order', orderId);
  }
}

export function onLocationUpdated(callback: (data: any) => void) {
  const s = initializeSocket();
  s.on('location-updated', callback);
}

export function offLocationUpdated(callback: (data: any) => void) {
  if (socket) {
    socket.off('location-updated', callback);
  }
}
