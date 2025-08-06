import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db'; // Import our database pool

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// === Middleware ===
// Enable CORS for your React app
app.use(cors({ origin: 'http://localhost:5173' })); 
// Enable Express to parse JSON request bodies
app.use(express.json()); 

// === API Routes ===
app.get('/api/excel-data', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM excel_data ORDER BY uploaded_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('API Error fetching excel_data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/excel-data', async (req, res) => {
  try {
    const { fileName, sheetData, validationPassed } = req.body;
    if (!fileName || !sheetData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const query = `
      INSERT INTO excel_data (file_name, sheet_data, headers, row_count, validation_passed)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      fileName,
      JSON.stringify(sheetData.originalData),
      sheetData.headers,
      sheetData.originalData.length,
      validationPassed
    ];

    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('API Error inserting excel_data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});