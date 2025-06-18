import fs from 'fs';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

const addMissingProblems = async () => {
    try {
        // Read and parse CSV file
        const parser = fs
            .createReadStream('LCcompany.csv')
            .pipe(parse({
                columns: true,
                skip_empty_lines: true
            }));

        let added = 0;
        let skipped = 0;

        for await (const record of parser) {
            const { Title, Slug, Company } = record;

            // Check if problem already exists
            const existingProblem = await Problem.findOne({
                $or: [
                    { title: Title },
                    { slug: Slug }
                ]
            });

            if (!existingProblem) {
                // Create new problem
                const problem = new Problem({
                    title: Title,
                    slug: Slug,
                    url: `https://leetcode.com/problems/${Slug}`,
                    rating: null,
                    topics: [],
                    companies: Company.split(';')
                        .map(c => c.trim())
                        .filter(c => c.length > 0)
                });

                await problem.save();
                added++;
                console.log(`Added: ${Title}`);
            } else {
                skipped++;
                console.log(`Skipped (already exists): ${Title}`);
            }
        }

        console.log(`\nUpdate complete!`);
        console.log(`Added: ${added} problems`);
        console.log(`Skipped: ${skipped} problems`);

    } catch (error) {
        console.error('Error adding problems:', error);
    } finally {
        mongoose.disconnect();
    }
};

// Run the update
connectDB().then(addMissingProblems); 