const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 DB Name: ${conn.connection.name}`);

    // Ensure sessions TTL index is set to 1 hour (3600 seconds)
    try {
      const db = conn.connection.db;
      const collections = await db.listCollections({ name: 'sessions' }).toArray();
      if (collections.length > 0) {
        await db.command({
          collMod: 'sessions',
          index: {
            keyPattern: { lastActivity: 1 },
            expireAfterSeconds: 60 * 60, // 1 hour (3600 seconds)
          },
        });
      }
    } catch (indexErr) {
      console.warn("Notice checking session TTL index:", indexErr.message);
    }
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;