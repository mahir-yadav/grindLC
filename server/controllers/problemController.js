import Problem from '../models/Problem.js';

// GET all problems
export const getAllProblems = async (req, res) => {
    try {
        const problems = await Problem.find({});
        console.log('✅ Got problems:', problems.length);
        res.status(200).json(problems);
    } catch (err) {
        console.error('❌ Error in getAllProblems:', error.message);
        res.status(500).json({ error: 'Failed to fetch problems' });
    }
};

// (optional) GET by slug
export const getProblemBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const problem = await Problem.findOne({ slug });
        if (!problem) return res.status(404).json({ error: 'Problem not found' });
        res.json(problem);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
