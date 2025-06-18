import Feedback from '../models/Feedback.js';

const MAX_FEEDBACKS = 20;

export const submitFeedback = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Feedback message is required' });
        }

        const feedback = new Feedback({ message });
        await feedback.save();

        const count = await Feedback.countDocuments();

        if (count > MAX_FEEDBACKS) {
            const oldestFeedbacks = await Feedback.find()
                .sort({ createdAt: 1 })
                .limit(count - MAX_FEEDBACKS);

            const idsToDelete = oldestFeedbacks.map(f => f._id);
            await Feedback.deleteMany({ _id: { $in: idsToDelete } });
        }

        res.status(201).json({
            message: 'Feedback submitted successfully',
            totalFeedbacks: Math.min(count, MAX_FEEDBACKS)
        });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
}; 