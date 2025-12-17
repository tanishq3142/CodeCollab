import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        // Force a command to verify connection
        // Mongoose connection logic
        if (mongoose.connection && mongoose.connection.db) {
            await mongoose.connection.db.admin().ping();
            console.log(`MongoDB Connected: ${conn.connection.host}`);
        } else {
            console.log(`MongoDB Connected (ping skipped): ${conn.connection.host}`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error("Please make sure MongoDB is running.");
        process.exit(1);
    }
};

export default connectDB;
