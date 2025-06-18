import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';

dotenv.config();

const seedWithCompanies = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Read the ratings file
        const data = fs.readFileSync('ratings.txt', 'utf-8').split('\n').slice(1); // skip header

        // Clear existing problems
        await Problem.deleteMany({});
        console.log('✅ Cleared existing problems');

        const problems = [];
        for (let line of data) {
            if (!line.trim()) continue;

            const cols = line.split('\t');
            if (cols.length < 5) continue;

            const rating = parseFloat(cols[0]);
            const id = parseInt(cols[1]);
            const title = cols[2].trim();
            const slug = cols[4].trim();

            // Create problem object
            const problem = {
                id,
                title,
                slug,
                url: `https://leetcode.com/problems/${slug}`,
                rating,
                topics: [], // We'll fetch these later if needed
                companies: [] // We'll add company tags later
            };

            problems.push(problem);
        }

        // Insert all problems
        await Problem.insertMany(problems);
        console.log(`✅ Successfully imported ${problems.length} problems`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error seeding problems:', error);
        process.exit(1);
    }
};

seedWithCompanies(); 