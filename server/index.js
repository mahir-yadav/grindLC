// index.js (pure ES module style)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js'; // Make sure db.js uses `export default`
import problemRoutes from './routes/problemRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/problems', problemRoutes);

// Connect DB and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
});
