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
  },
  { timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
