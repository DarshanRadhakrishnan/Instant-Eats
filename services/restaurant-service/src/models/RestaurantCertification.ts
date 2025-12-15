import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurantCertification extends Document {
  _id: string;
  restaurantId: string;
  certificationName: 'MICHELIN_STAR' | 'FSSAI_GRADE' | 'ORGANIC_CERTIFIED' | 'HEALTHYEATING_VERIFIED' | 'HYGIENE_CERTIFIED';
  certificationLevel: 'GOLD' | 'SILVER' | 'BRONZE' | 'CERTIFIED';
  certificationBody: string;
  score: number; // 0-100
  certificationDate: Date;
  expiryDate: Date;
  isActive: boolean;
  verificationUrl?: string;
  inspectionDetails?: {
    hygiene?: number; // 0-100
    foodQuality?: number; // 0-100
    nutritionValue?: number; // 0-100
    sanitation?: number; // 0-100
  };
  createdAt: Date;
  updatedAt: Date;
}

const certificationSchema = new Schema<IRestaurantCertification>(
  {
    restaurantId: {
      type: String,
      required: true,
      ref: 'Restaurant',
      index: true,
    },
    certificationName: {
      type: String,
      enum: [
        'MICHELIN_STAR',
        'FSSAI_GRADE',
        'ORGANIC_CERTIFIED',
        'HEALTHYEATING_VERIFIED',
        'HYGIENE_CERTIFIED',
      ],
      required: true,
    },
    certificationLevel: {
      type: String,
      enum: ['GOLD', 'SILVER', 'BRONZE', 'CERTIFIED'],
      default: 'CERTIFIED',
    },
    certificationBody: {
      type: String,
      required: true,
      description: 'Issuing authority (e.g., "Michelin Guide", "FSSAI")',
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    certificationDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    verificationUrl: {
      type: String,
      description: 'Link to verify certification with authority',
    },
    inspectionDetails: {
      hygiene: { type: Number, min: 0, max: 100 },
      foodQuality: { type: Number, min: 0, max: 100 },
      nutritionValue: { type: Number, min: 0, max: 100 },
      sanitation: { type: Number, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
certificationSchema.index({ restaurantId: 1, isActive: 1 });
certificationSchema.index({ certificationName: 1 });
certificationSchema.index({ score: -1 });
certificationSchema.index({ expiryDate: 1 }); // Find expired certifications

export const RestaurantCertification = mongoose.model<IRestaurantCertification>(
  'RestaurantCertification',
  certificationSchema
);
