import mongoose, { mongo } from 'mongoose';

let isConnected: boolean = false; // variable to check if mongoose is connected

export const connectToDatabase = async () => {
  mongoose.set('strictQuery', true);

  if (!process.env.MONGODB_URI) {
    throw new Error('No MONGODB_URI env variable');
  }
  if (isConnected) {
    console.log('Already connected to database');
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('Connected to database');
  } catch (error) {
    // Write catch error if not connected to database
    console.log('Error connecting to database: ', error);
  }
};
