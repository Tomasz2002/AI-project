require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API działa!' });
});

// Pobierz wszystkie dokumenty z kolekcji
app.get('/api/data', async (req, res) => {
  try {
    const db = await connectDB();
    const data = await db.collection('documents').find().toArray();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dodaj nowy dokument
app.post('/api/data', async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection('documents').insertOne(req.body);
    res.json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server na http://localhost:${PORT}`));