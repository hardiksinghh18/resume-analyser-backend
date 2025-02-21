const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); // 32-byte key for AES-256

const encrypt = (data) => {
  const iv = crypto.randomBytes(16); // Generate a random IV
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`; // Store IV with encrypted data
};

const decrypt = (data) => {
  try {
    // Split the stored data into IV and encrypted text
    const [ivHex, encryptedText] = data.split(':');

    // Check if both IV and encrypted text are present
    if (!ivHex || !encryptedText) {
      throw new Error('Invalid encrypted data format');
    }

    // Convert IV from hex to Buffer
    const iv = Buffer.from(ivHex, 'hex');

    // Decrypt the text
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Failed to decrypt data');
  }
};

module.exports = { encrypt, decrypt };