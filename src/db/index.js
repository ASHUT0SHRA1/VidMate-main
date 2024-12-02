import mongoose from "mongoose";
import {DB_NAME} from '../constant.js'
const connectDB = async () => {
  try {
    // Connect to the MongoDB cluster
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log("Connected to MongoDB successfully!");
    console.log(connectionInstance.connection.host)
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
