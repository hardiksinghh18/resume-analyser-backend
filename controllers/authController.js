const jwt = require('jsonwebtoken');
const { encrypt } = require('../utils/encryption');

const authenticateUser = (req, res) => {
  const { username, password } = req.body;

  // Hardcoded credentials
  if (username === 'naval.ravikant' && password === '05111974') {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ JWT: token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

module.exports = { authenticateUser };