require('dotenv').config(); 
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const errorHandler = require('./utils/errorHandler');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);

// Error handling
app.use(errorHandler);

app.get('/',(req,res)=>{
  res.status(200).json({message:"hello from server"})
})
// Connect to DB and start server
connectDB().then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port 3000');
  });
});