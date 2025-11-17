import express from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Restaurant } from './models/Restaurant';
import { MenuItem } from './models/MenuItem';

const app = express();
app.use(express.json());

// MongoDB Connection
async function connectMongoDB() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://root:mongodb@localhost:27017/restaurants?authSource=admin';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'restaurant-service', timestamp: new Date().toISOString() });
});

// Get all restaurants
app.get('/', async (req, res) => {
  try {
    const { city, limit = 10, page = 1 } = req.query;

    const query: any = { isActive: true };
    if (city) query.city = city;

    const skip = ((Number(page) || 1) - 1) * Number(limit);
    const restaurants = await Restaurant.find(query).skip(skip).limit(Number(limit));

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

// Get restaurant by ID
app.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

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

// Get restaurant menu
app.get('/:id/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ restaurantId: req.params.id, isAvailable: true });

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

// Create restaurant
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

const PORT = process.env.PORT || 3003;

app.listen(PORT, async () => {
  console.log(`✅ Restaurant Service is running on port ${PORT}`);
  try {
    await connectMongoDB();
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
});
