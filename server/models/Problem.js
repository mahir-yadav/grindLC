import mongoose from 'mongoose';

const problemSchema = new mongoose.Schema({
    id: Number,
    title: String,
    slug: String,
    url: String,
    rating: Number,
    difficulty: String,
    topics: [String],
    companies: [String]
});


const Problem = mongoose.model('Problem', problemSchema);
export default Problem;