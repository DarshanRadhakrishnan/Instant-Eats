import express from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Restaurant } from './models/Restaurant';
import { MenuItem } from './models/MenuItem';
import { RestaurantCertification } from './models/RestaurantCertification';
import { initializeRedis, getCachedData, cacheData, invalidateCache } from './cache';
import {
  calculateHealthScore,
  determineCertificationLevel,
  isHealthyRestaurant,
} from './integrations/healthAuth';
import { setupSwagger } from '../../../shared/openapi/setup';
import './openapi';

const app = express();
app.use(express.json());

// Setup Swagger/OpenAPI documentation
setupSwagger({
  app,
  title: 'Restaurant Service',
  description: 'Manages restaurant information, menus, and operations with OpenAPI integration for easy service discovery',
  version: '1.0.0',
  serviceName: 'restaurant-service',
  port: 3003,
  docsPath: '/api-docs',
});

// MongoDB Connection with pooling optimization
async function connectMongoDB() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://root:mongodb@localhost:27017/restaurants?authSource=admin';
    await mongoose.connect(mongoUrl, {
      maxPoolSize: 50, // Connection pool size
      minPoolSize: 10, // Minimum connections
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      readConcern: { level: 'majority' },
    });
    console.log('✅ Connected to MongoDB with connection pooling');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'restaurant-service', timestamp: new Date().toISOString() });
});

// Get all restaurants with caching
app.get('/', async (req, res) => {
  try {
    const { city, limit = 10, page = 1 } = req.query;
    
    // Create cache key
    const cacheKey = `restaurants:${city || 'all'}:${limit}:${page}`;
    
    // Check cache first
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const query: any = { isActive: true };
    if (city) query.city = city;

    const skip = ((Number(page) || 1) - 1) * Number(limit);
    const restaurants = await Restaurant.find(query)
      .skip(skip)
      .limit(Number(limit))
      .lean(); // Returns plain JS objects (faster)

    // Cache for 1 hour
    await cacheData(cacheKey, restaurants, 3600);

    res.json({
      success: true,
      data: restaurants,
    });
  } catch (error: any) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch restaurants',
    });
  }
});

// Get restaurant by ID with caching
app.get('/:id', async (req, res) => {
  try {
    const cacheKey = `restaurant:${req.params.id}`;
    
    // Check cache first
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }
    
    const restaurant = await Restaurant.findById(req.params.id).lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Cache for 2 hours
    await cacheData(cacheKey, restaurant, 7200);

    res.json({
      success: true,
      data: restaurant,
    });
  } catch (error: any) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch restaurant',
    });
  }
});

// Get restaurant menu with caching
app.get('/:id/menu', async (req, res) => {
  try {
    const cacheKey = `menu:${req.params.id}`;
    
    // Check cache first
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }
    
    const menuItems = await MenuItem.find({
      restaurantId: req.params.id,
      isAvailable: true
    }).lean();

    // Cache for 1 hour
    await cacheData(cacheKey, menuItems, 3600);

    res.json({
      success: true,
      data: menuItems,
    });
  } catch (error: any) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch menu',
    });
  }
});

// Create restaurant with cache invalidation
app.post('/', async (req, res) => {
  try {
    const { name, city, address, latitude, longitude, phoneNumber, email, ownerUserId } = req.body;

    if (!name || !city || !address || !email || !ownerUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const restaurant = new Restaurant({
      _id: uuidv4(),
      name,
      city,
      address,
      latitude,
      longitude,
      phoneNumber,
      email,
      ownerUserId,
    });

    await restaurant.save();

    // Invalidate related cache keys
    await invalidateCache('restaurants:*');
    await invalidateCache(`restaurant:${restaurant._id}`);

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: restaurant,
    });
  } catch (error: any) {
    console.error('Create restaurant error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create restaurant',
    });
  }
});

// ============ CERTIFICATION ROUTES ============

// GET /restaurants/certified - Only show certified healthy restaurants
app.get('/certified', async (req, res) => {
  try {
    const { city, minHealthScore = 70, limit = 10, page = 1 } = req.query;

    const cacheKey = `certified-restaurants:${city}:${minHealthScore}:${limit}:${page}`;
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const query: any = {
      isActive: true,
      isCertified: true,
      healthScore: { $gte: parseInt(String(minHealthScore)) },
    };

    if (city) query.city = city;

    const skip = ((Number(page) || 1) - 1) * Number(limit);
    const restaurants = await Restaurant.find(query)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Cache for 30 minutes
    await cacheData(cacheKey, restaurants, 1800);

    res.json({
      success: true,
      data: restaurants,
      count: restaurants.length,
    });
  } catch (error: any) {
    console.error('Get certified restaurants error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch certified restaurants',
    });
  }
});

// POST /restaurants/:id/certifications - Add certification to restaurant
app.post('/:id/certifications', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const {
      certificationName,
      certificationLevel,
      certificationBody,
      score,
      certificationDate,
      expiryDate,
      inspectionDetails,
      verificationUrl,
    } = req.body;

    // Validate restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Validate required fields
    if (!certificationName || !certificationBody || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required certification fields',
      });
    }

    // Create certification
    const certification = new RestaurantCertification({
      _id: uuidv4(),
      restaurantId,
      certificationName,
      certificationLevel,
      certificationBody,
      score,
      certificationDate: certificationDate || new Date(),
      expiryDate,
      inspectionDetails,
      verificationUrl,
      isActive: new Date(expiryDate || new Date()) > new Date(),
    });

    await certification.save();

    // Get all active certifications for this restaurant
    const allCerts = await RestaurantCertification.find({
      restaurantId,
      isActive: true,
    }).lean();

    // Calculate new health score
    const avgHealthScore = calculateHealthScore(allCerts);
    const newCertLevel = determineCertificationLevel(avgHealthScore);
    const isCertified = isHealthyRestaurant(avgHealthScore, true);

    // Update restaurant with new health metrics
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      {
        healthScore: avgHealthScore,
        isCertified,
        certificationLevel: newCertLevel,
        certifications: allCerts.map((c) => c._id),
        lastInspectionDate: new Date(),
      },
      { new: true, lean: true }
    );

    // Invalidate related caches
    await invalidateCache(`certified-restaurants:*`);
    await invalidateCache(`restaurants:*`);
    await invalidateCache(`restaurant:${restaurantId}`);

    res.status(201).json({
      success: true,
      message: 'Certification added and health score updated',
      data: {
        certification,
        restaurant: updatedRestaurant,
        healthScore: avgHealthScore,
        certificationLevel: newCertLevel,
      },
    });
  } catch (error: any) {
    console.error('Add certification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add certification',
    });
  }
});

// GET /restaurants/:id/certifications - Get all certifications for a restaurant
app.get('/:id/certifications', async (req, res) => {
  try {
    const cacheKey = `certifications:${req.params.id}`;

    // Check cache first
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const certifications = await RestaurantCertification.find({
      restaurantId: req.params.id,
      isActive: true,
    }).lean();

    // Cache for 2 hours
    await cacheData(cacheKey, certifications, 7200);

    res.json({
      success: true,
      data: certifications,
      count: certifications.length,
    });
  } catch (error: any) {
    console.error('Get certifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch certifications',
    });
  }
});

// DELETE /restaurants/:id/certifications/:certId - Revoke a certification
app.delete('/:id/certifications/:certId', async (req, res) => {
  try {
    const { id: restaurantId, certId } = req.params;

    // Mark certification as inactive
    const certification = await RestaurantCertification.findByIdAndUpdate(
      certId,
      { isActive: false },
      { new: true, lean: true }
    );

    if (!certification) {
      return res.status(404).json({
        success: false,
        error: 'Certification not found',
      });
    }

    // Recalculate health score
    const allCerts = await RestaurantCertification.find({
      restaurantId,
      isActive: true,
    }).lean();

    const avgHealthScore = calculateHealthScore(allCerts);
    const newCertLevel = determineCertificationLevel(avgHealthScore);
    const isCertified = isHealthyRestaurant(avgHealthScore, allCerts.length > 0);

    // Update restaurant
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      {
        healthScore: avgHealthScore,
        isCertified,
        certificationLevel: newCertLevel,
        certifications: allCerts.map((c) => c._id),
      },
      { new: true, lean: true }
    );

    // Invalidate caches
    await invalidateCache(`certified-restaurants:*`);
    await invalidateCache(`certifications:${restaurantId}`);
    await invalidateCache(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Certification revoked',
      data: {
        restaurant: updatedRestaurant,
        healthScore: avgHealthScore,
      },
    });
  } catch (error: any) {
    console.error('Revoke certification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke certification',
    });
  }
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, async () => {
  console.log(`✅ Restaurant Service is running on port ${PORT}`);
  try {
    await connectMongoDB();
    console.log('🟢 MongoDB connection pool initialized');
    
    // Initialize Redis connection
    try {
      await initializeRedis();
      console.log('🟢 Redis cache initialized');
    } catch (redisError) {
      console.error('⚠️ Redis failed to connect (cache disabled):', redisError);
      // Service continues without caching
    }
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
});
