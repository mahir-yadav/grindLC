import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';
import fetch from 'node-fetch';
import fs from 'fs';
import { parse } from 'csv-parse';

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

const LEETCODE_API_URL = 'https://leetcode.com/api/problems/all/';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

// Read ratings from ratings.txt
const readRatingsFromFile = () => {
    try {
        const ratingsData = fs.readFileSync('ratings.txt', 'utf8');
        const ratings = {};
        ratingsData.split('\n').forEach(line => {
            const cols = line.split('\t');
            if (cols.length >= 5) {
                const rating = Math.round(parseFloat(cols[0]));
                const id = cols[1].trim();
                const title = cols[2].trim();
                const slug = cols[4].trim();
                if (title) ratings[title] = rating;
                if (slug) ratings[slug] = rating;
            }
        });
        return ratings;
    } catch (error) {
        console.error('Error reading ratings.txt:', error);
        return {};
    }
};

// Read company tags from LCcompany.csv
const readCompanyTagsFromFile = async () => {
    try {
        const companies = {};
        const parser = fs
            .createReadStream('LCcompany.csv')
            .pipe(parse({
                columns: true,
                skip_empty_lines: true
            }));

        for await (const record of parser) {
            const { Title, Company } = record;
            if (Title && Company) {
                companies[Title.trim()] = Company.split(';')
                    .map(c => c.trim())
                    .filter(c => c.length > 0);
            }
        }
        return companies;
    } catch (error) {
        console.error('Error reading LCcompany.csv:', error);
        return {};
    }
};

const fetchAllProblems = async () => {
    try {
        const response = await fetch(LEETCODE_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.stat_status_pairs.reduce((acc, problem) => {
            acc[problem.stat.question__title] = {
                id: problem.stat.question_id,
                difficulty: problem.difficulty.level === 1 ? 'Easy' :
                    problem.difficulty.level === 2 ? 'Medium' : 'Hard',
                titleSlug: problem.stat.question__title_slug
            };
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching all problems:', error);
        return {};
    }
};

const fetchProblemTopics = async (titleSlug) => {
    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                    query getQuestionDetail($titleSlug: String!) {
                        question(titleSlug: $titleSlug) {
                            topicTags {
                                name
                            }
                        }
                    }
                `,
                variables: {
                    titleSlug: titleSlug
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.data && data.data.question && data.data.question.topicTags) {
            return data.data.question.topicTags.map(tag => tag.name);
        }
        return [];
    } catch (error) {
        console.error(`Error fetching topics for ${titleSlug}:`, error);
        return [];
    }
};

const updateAllProblemData = async () => {
    try {
        // Read ratings and company tags from files first
        console.log('Reading ratings from ratings.txt...');
        const ratingsFromFile = readRatingsFromFile();
        console.log(`Found ${Object.keys(ratingsFromFile).length} ratings in file`);

        console.log('Reading company tags from LCcompany.csv...');
        const companiesFromFile = await readCompanyTagsFromFile();
        console.log(`Found ${Object.keys(companiesFromFile).length} company entries in file`);

        console.log('Fetching all problems from LeetCode...');
        const leetcodeProblems = await fetchAllProblems();
        console.log(`Found ${Object.keys(leetcodeProblems).length} problems on LeetCode`);

        const problems = await Problem.find({});
        const totalProblems = problems.length;
        let updated = 0;
        let failed = 0;
        let currentBatch = 0;
        const batchSize = 50; // Process 50 problems at a time

        console.log(`Starting update for ${totalProblems} problems...`);

        while (currentBatch * batchSize < totalProblems) {
            const start = currentBatch * batchSize;
            const end = Math.min(start + batchSize, totalProblems);
            const batch = problems.slice(start, end);

            console.log(`\nProcessing batch ${currentBatch + 1} (problems ${start + 1} to ${end})`);
            console.log(`Batch progress: 0/${batch.length}`);

            let batchProgress = 0;
            for (const problem of batch) {
                try {
                    console.log(`\nProcessing: ${problem.title}`);
                    const leetcodeData = leetcodeProblems[problem.title];

                    if (leetcodeData) {
                        // Update problem with new data
                        problem.id = leetcodeData.id;
                        problem.difficulty = leetcodeData.difficulty;

                        // Get companies from LCcompany.csv
                        if (companiesFromFile[problem.title]) {
                            problem.companies = companiesFromFile[problem.title];
                        }

                        // Get rating from ratings.txt by title or slug
                        let rating = null;
                        if (ratingsFromFile[problem.title]) {
                            rating = Math.round(parseFloat(ratingsFromFile[problem.title]));
                        } else if (problem.slug && ratingsFromFile[problem.slug]) {
                            rating = Math.round(parseFloat(ratingsFromFile[problem.slug]));
                        }
                        if (rating !== null && !isNaN(rating)) {
                            problem.rating = rating;
                        } else if (problem.companies && problem.companies.length > 0) {
                            console.warn(`⚠️ Company tag present but no rating found for: ${problem.title} (slug: ${problem.slug})`);
                        }

                        // Fetch and update topics
                        if (leetcodeData.titleSlug) {
                            const topics = await fetchProblemTopics(leetcodeData.titleSlug);
                            if (topics.length > 0) {
                                problem.topics = topics;
                            }
                        }

                        await problem.save();
                        updated++;
                        batchProgress++;

                        console.log('\n' + '='.repeat(80));
                        console.log(`QUESTION ${batchProgress}/${batch.length} - UPDATE COMPLETE ✓`);
                        console.log('='.repeat(80));
                        console.log(`Title: ${problem.title}`);
                        console.log(`ID: ${problem.id}`);
                        console.log(`Difficulty: ${problem.difficulty}`);
                        console.log(`Rating: ${problem.rating || 'None'}`);
                        console.log(`Companies: ${problem.companies?.join(', ') || 'None'}`);
                        console.log(`Topics: ${problem.topics?.join(', ') || 'None'}`);
                        console.log('='.repeat(80) + '\n');
                    } else {
                        console.log('\n' + '='.repeat(80));
                        console.log(`QUESTION ${batchProgress + 1}/${batch.length} - UPDATE FAILED ❌`);
                        console.log('='.repeat(80));
                        console.log(`Title: ${problem.title}`);
                        console.log(`Error: No LeetCode data found`);
                        console.log('='.repeat(80) + '\n');
                        failed++;
                        batchProgress++;
                    }

                    // Add a small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`❌ Error updating ${problem.title}:`, error);
                    failed++;
                    batchProgress++;
                    console.log(`Batch progress: ${batchProgress}/${batch.length}`);
                }
            }

            currentBatch++;
            console.log(`\nBatch ${currentBatch} complete!`);
            console.log(`Progress: ${Math.round((end / totalProblems) * 100)}%`);
            console.log(`Updated: ${updated}, Failed: ${failed}`);

            // Add a longer delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\nUpdate complete!');
        console.log(`Successfully updated: ${updated} problems`);
        console.log(`Failed to update: ${failed} problems`);

        console.log('All problems updated successfully!');
        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating problems:', error);
        process.exit(1);
    } finally {
        mongoose.disconnect();
    }
};

// Run the update
connectDB().then(updateAllProblemData); 