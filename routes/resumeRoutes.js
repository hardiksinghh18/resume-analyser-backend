const express = require('express');
const { enrichResume, searchResume } = require('../controllers/resumeController');
const authenticateJWT = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/enrich', authenticateJWT, enrichResume);
router.post('/search', authenticateJWT, searchResume);

module.exports = router;