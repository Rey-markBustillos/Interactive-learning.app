import mongoose from "mongoose";

const connectDB = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        dbName: "scan_to_track",
        tls: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 10000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        console.error("All MongoDB connection attempts failed. Exiting.");
        process.exit(1);
      }
      const wait = attempt * 2000;
      console.log(`Retrying in ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
};

export default connectDB;
