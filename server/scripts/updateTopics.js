import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';
import fetch from 'node-fetch';

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

const LEETCODE_API_URL = 'https://leetcode.com/graphql';

const fetchTopicsForProblem = async (titleSlug) => {
    const query = `
        query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                topicTags {
                    name
                    slug
                }
            }
        }
    `;

    try {
        const response = await fetch(LEETCODE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: { titleSlug },
            }),
        });

        const data = await response.json();
        if (data.data?.question?.topicTags) {
            return data.data.question.topicTags.map(tag => tag.name);
        }
        return [];
    } catch (error) {
        console.error(`Error fetching topics for ${titleSlug}:`, error);
        return [];
    }
};

const updateTopics = async () => {
    try {
        const problems = await Problem.find({});
        let updated = 0;
        let failed = 0;

        for (const problem of problems) {
            try {
                console.log(`Fetching topics for: ${problem.title}`);
                const topics = await fetchTopicsForProblem(problem.slug);

                if (topics.length > 0) {
                    problem.topics = topics;
                    await problem.save();
                    updated++;
                    console.log(`✅ Updated topics for: ${problem.title}`);
                } else {
                    console.log(`⚠️ No topics found for: ${problem.title}`);
                    failed++;
                }

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`❌ Error updating ${problem.title}:`, error);
                failed++;
            }
        }

        console.log('\nUpdate complete!');
        console.log(`Successfully updated: ${updated} problems`);
        console.log(`Failed to update: ${failed} problems`);

    } catch (error) {
        console.error('Error updating topics:', error);
    } finally {
        mongoose.disconnect();
    }
};

// Run the update
connectDB().then(updateTopics); 