import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/Problem.js";

dotenv.config();

const clearDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Delete all documents in the problems collection
        const result = await Question.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} problems from the database`);

        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
    } catch (error) {
        console.error("❌ Error clearing database:", error);
        process.exit(1);
    }
};

clearDatabase(); 