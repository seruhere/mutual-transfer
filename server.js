require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mutual_transfer';

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
console.log('Connecting to MongoDB...');
console.log('URI:', MONGODB_URI.replace(/:([^@]+)@/, ':****@')); // hide password in logs

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', dbState: mongoose.connection.readyState });
});

// API Routes
app.use('/api', require('./routes/employees'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
