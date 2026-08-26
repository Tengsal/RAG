import mongoose from 'mongoose';
import { env } from './env';
import { User } from '../models/user.model';
import { hashPassword } from '../utils/password';

export async function seedAdminUser(): Promise<void> {
  try {
    const adminEmail = env.ADMIN_EMAIL.toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      console.log(`[Seed] Creating initial Admin account (${adminEmail})...`);
      const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
      await User.create({
        name: env.ADMIN_NAME.trim(),
        email: adminEmail,
        passwordHash,
        role: 'admin',
      });
      console.log(`[Seed] Admin account (${adminEmail}) successfully seeded into MongoDB.`);
    } else {
      console.log(`[Seed] Admin account (${adminEmail}) already exists.`);
    }
  } catch (error) {
    console.error(`[Seed] Failed to seed Admin user:`, error);
  }
}

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    await seedAdminUser();
  } catch (error) {
    console.error(`[MongoDB] Connection error:`, error);
    process.exit(1);
  }
}
