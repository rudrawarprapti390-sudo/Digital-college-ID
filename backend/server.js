const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const idCardRoutes = require('./routes/idCardRoutes');
const projectRoutes = require('./routes/projectRoutes');

dotenv.config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Root Route
app.get('/', (req, res) => {
    res.send('Digital ID API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/idcards', idCardRoutes);
app.use('/api/projects', projectRoutes);

// Error Handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode ? res.statusCode : 500;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

app.listen(port, () => console.log(`Server started on port ${port}`));
