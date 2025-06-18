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

const updateCompanies = async () => {
    try {
        // Read and parse CSV file
        const parser = fs
            .createReadStream('LCcompany.csv')
            .pipe(parse({
                columns: true,
                skip_empty_lines: true
            }));

        let updated = 0;
        let notFound = 0;

        for await (const record of parser) {
            const { Title, Slug, Company } = record;

            // Find the problem by title or slug
            const problem = await Problem.findOne({
                $or: [
                    { title: Title },
                    { slug: Slug }
                ]
            });

            if (problem) {
                // Split companies string into array and clean up
                const companies = Company.split(';')
                    .map(c => c.trim())
                    .filter(c => c.length > 0);

                // Update the problem
                problem.companies = companies;
                // Set rating to null for these problems
                problem.rating = null;
                await problem.save();
                updated++;
                console.log(`Updated: ${Title}`);
            } else {
                notFound++;
                console.log(`Not found: ${Title}`);
            }
        }

        console.log(`\nUpdate complete!`);
        console.log(`Updated: ${updated} problems`);
        console.log(`Not found: ${notFound} problems`);

    } catch (error) {
        console.error('Error updating companies:', error);
    } finally {
        mongoose.disconnect();
    }
};

// Run the update
connectDB().then(updateCompanies); 