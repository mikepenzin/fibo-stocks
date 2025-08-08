import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { analyzeTicker } from './src/analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// API endpoint
app.get('/api/analyze/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const data = await analyzeTicker(ticker.toUpperCase());
    res.json({ ok: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
