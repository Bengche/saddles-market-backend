const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit OTP
 */
const generateOTP = () => {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, '0');
};

/**
 * Generate a secure URL-safe token
 */
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Get OTP expiry timestamp (default 15 minutes)
 */
const getOTPExpiry = (minutes = 15) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Get token expiry timestamp (default 1 hour)
 */
const getTokenExpiry = (hours = 1) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

module.exports = { generateOTP, generateToken, getOTPExpiry, getTokenExpiry };
