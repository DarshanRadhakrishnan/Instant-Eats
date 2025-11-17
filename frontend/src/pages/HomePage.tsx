import { useState } from 'react';

export function HomePage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'restaurants'>('orders');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-blue-600">Instant Eats</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-3 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Orders
            </button>
            <button
              onClick={() => setActiveTab('restaurants')}
              className={`py-4 px-3 font-medium text-sm ${
                activeTab === 'restaurants'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Restaurants
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* TODO: Load orders from API */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-lg text-gray-900">No orders yet</h3>
                <p className="text-gray-600 mt-2">Start ordering from your favorite restaurants!</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Restaurants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* TODO: Load restaurants from API */}
              <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                <div className="bg-gray-300 h-40"></div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900">Restaurant Name</h3>
                  <p className="text-gray-600 text-sm mt-1">⭐ 4.5 • 20-30 mins</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
