import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veda-ai';
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully to:', uri);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Do not crash the process in dev, just alert
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
