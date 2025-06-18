import express from 'express';
import Problem from '../models/Problem.js';

const router = express.Router();

router.get('/', async (req, res) => {
    console.log('➡️ /api/problems called');

    try {
        console.log('🔍 Attempting to fetch problems from MongoDB...');
        const problems = await Problem.find();
        console.log(`✅ Found ${problems.length} problems`);
        res.json(problems);
    } catch (err) {
        console.error('❌ Error fetching problems:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
