import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  _id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Strategic indexes for performance optimization
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 }); // Menu items by restaurant & availability
menuItemSchema.index({ category: 1, restaurantId: 1 }); // Filter by category
menuItemSchema.index({ price: 1 }); // Price filtering/sorting

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
