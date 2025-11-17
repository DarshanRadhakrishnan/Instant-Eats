import { useState, useEffect } from 'react';
import { subscribeToOrder, onLocationUpdated } from '../utils/socketClient';

interface OrderLocation {
  orderId: string;
  deliveryPartnerId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function TrackingPage({ orderId }: { orderId: string }) {
  const [location, setLocation] = useState<OrderLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    setIsTracking(true);
    subscribeToOrder(orderId);

    const handleLocationUpdate = (data: OrderLocation) => {
      setLocation(data);
    };

    onLocationUpdated(handleLocationUpdate);

    return () => {
      setIsTracking(false);
    };
  }, [orderId]);

  if (!isTracking) {
    return <div className="text-center py-8">Loading tracking data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Tracking</h2>

      {location ? (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Delivery Partner ID</p>
            <p className="font-semibold text-gray-900">{location.deliveryPartnerId}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Latitude</p>
              <p className="font-semibold text-gray-900">{location.latitude.toFixed(4)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Longitude</p>
              <p className="font-semibold text-gray-900">{location.longitude.toFixed(4)}</p>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Last updated: {new Date(location.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">Waiting for location updates...</p>
        </div>
      )}
    </div>
  );
}
