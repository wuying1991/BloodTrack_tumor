import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import connectDB from './config/db';

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB().then(() => {
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});
