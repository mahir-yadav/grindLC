import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';

dotenv.config();

const updateCompanyTags = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Read the CSV file
        const data = fs.readFileSync('LCcompany.csv', 'utf-8');
        const lines = data.split('\n');

        // Skip header row
        const problems = lines.slice(1).map(line => {
            const [title, slug, companies] = line.split(',').map(field => field.trim());
            return {
                slug,
                companies: companies ? companies.split(';').map(company => company.trim()) : []
            };
        });

        let updatedCount = 0;
        for (const problem of problems) {
            if (!problem.slug) continue; // Skip invalid entries

            // Update the problem with company tags
            const result = await Problem.updateOne(
                { slug: problem.slug },
                { $set: { companies: problem.companies } }
            );

            if (result.modifiedCount > 0) {
                updatedCount++;
                console.log(`✅ Updated problem ${problem.slug} with company tags`);
            }
        }

        console.log(`✅ Successfully updated ${updatedCount} problems with company tags`);
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error updating company tags:', error);
        process.exit(1);
    }
};

updateCompanyTags(); 