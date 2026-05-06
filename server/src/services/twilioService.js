const twilio = require('twilio');
const { pulse } = require('./pulseService');

// Validate Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// Check if Twilio is configured
const isTwilioConfigured = () => {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && VERIFY_SID);
};

// Initialize client only if configured
let client = null;
if (isTwilioConfigured()) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('[TWILIO]: ✅ Twilio client initialized');
  } catch (err) {
    console.error('[TWILIO]: ❌ Failed to initialize Twilio client —', err.message);
  }
} else {
  console.warn('[TWILIO]: ⚠️  Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in .env');
}

const sendOTP = async (phoneNumber, socketId = null) => {
  if (!client) {
    throw new Error('Twilio not configured');
  }

  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Validate phone number format - must start with + and be E.164 compliant
  if (!phoneNumber.startsWith('+')) {
    throw new Error('Phone number must be in E.164 format (start with +)');
  }

  // Clean phone number - remove any non-digit characters except +
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  if (cleanPhone.length < 10) {
    throw new Error('Invalid phone number format - too short');
  }

  console.log('[MFA DEBUG] Sending OTP to:', cleanPhone);

  try {
    const verification = await client.verify.v2
      .services(VERIFY_SID)
      .verifications.create({ to: cleanPhone, channel: 'sms' });
    
    if (socketId) {
      pulse(socketId, 'TWILIO', `OTP dispatched to ${cleanPhone}`);
    }
    
    console.log('[TWILIO]: ✅ OTP sent to', cleanPhone);
    return verification.sid;
  } catch (err) {
    console.error('[TWILIO]: ❌ Failed to send OTP —', err.message);
    throw new Error(`Twilio error: ${err.message}`);
  }
};

const verifyOTP = async (phoneNumber, code, socketId = null) => {
  if (!client) {
    throw new Error('Twilio not configured');
  }

  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  if (!code) {
    throw new Error('Verification code is required');
  }

  // Validate phone number format - must start with + and be E.164 compliant
  if (!phoneNumber.startsWith('+')) {
    throw new Error('Phone number must be in E.164 format (start with +)');
  }

  // Clean phone number
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');

  console.log('[MFA DEBUG] Verifying OTP for phone:', cleanPhone);

  try {
    const result = await client.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: cleanPhone, code });
    
    const approved = result.status === 'approved';
    
    if (socketId) {
      pulse(socketId, 'TWILIO', approved ? 'OTP verified — session promoted' : 'OTP rejected');
    }
    
    console.log('[TWILIO]: OTP verification result:', approved ? 'approved' : 'rejected');
    return approved;
  } catch (err) {
    console.error('[TWILIO]: ❌ Failed to verify OTP —', err.message);
    throw new Error(`Twilio error: ${err.message}`);
  }
};

module.exports = { sendOTP, verifyOTP, isTwilioConfigured };