import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  _id: string;
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
  healthScore: number;
  certifications: string[];
  isCertified: boolean;
  certificationLevel: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';
  lastInspectionDate?: Date;
  healthViolations: string[];
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    city: { type: String, required: true, index: true },
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    ownerUserId: { type: String, required: true },
    rating: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      description: 'Aggregate health rating (0-100)',
    },
    certifications: [{
      type: String,
      ref: 'RestaurantCertification',
    }],
    isCertified: {
      type: Boolean,
      default: false,
      index: true,
      description: 'Only certified restaurants appear in search',
    },
    certificationLevel: {
      type: String,
      enum: ['GOLD', 'SILVER', 'BRONZE', 'NONE'],
      default: 'NONE',
    },
    lastInspectionDate: Date,
    healthViolations: [{
      type: String,
      description: 'Previous violations if any',
    }],
  },
  { timestamps: true }
);

// Strategic indexes for performance optimization
restaurantSchema.index({ city: 1, isActive: 1 }); // Filter by city & active status
restaurantSchema.index({ rating: -1, isActive: 1 }); // Sort by rating
restaurantSchema.index({ ownerUserId: 1 }); // Owner lookup
restaurantSchema.index({ createdAt: -1 }); // Recent restaurants
restaurantSchema.index({ email: 1 }, { unique: true }); // Email uniqueness
restaurantSchema.index({
  latitude: '2dsphere',
  longitude: '2dsphere'
}); // Geospatial queries (nearby restaurants)
restaurantSchema.index({ isCertified: 1, healthScore: -1 }); // Filter by health certification

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
