import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`);
});