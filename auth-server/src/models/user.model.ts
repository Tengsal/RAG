import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not include in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// Dedicated collection: the shared MongoDB `users` collection is also written
// by another app (real_estate_CRM) whose documents store the hash under
// `password` with no `passwordHash` field. Finding one of those by email made
// bcrypt.compare() receive `undefined`. Keep ADTU auth users isolated.
export const User = model<IUserDocument>('User', userSchema, 'adtu_users');
