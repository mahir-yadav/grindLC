import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';

dotenv.config();

const importProblems = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Read the JSON file
        const data = JSON.parse(fs.readFileSync('problems.json', 'utf-8'));

        // Clear existing problems
        await Problem.deleteMany({});
        console.log('✅ Cleared existing problems');

        // Insert new problems
        const problems = data.map(problem => ({
            id: problem.id,
            title: problem.title,
            slug: problem.slug,
            url: `https://leetcode.com/problems/${problem.slug}`,
            rating: problem.rating || 0,
            topics: problem.topics || [],
            companies: problem.companies || []
        }));

        await Problem.insertMany(problems);
        console.log(`✅ Successfully imported ${problems.length} problems`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error importing problems:', error);
        process.exit(1);
    }
};

importProblems(); 