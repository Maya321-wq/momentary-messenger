const twilio = require('twilio');
const { pulse } = require('./pulseService');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const sendOTP = async (phoneNumber, socketId = null) => {
  const verification = await client.verify.v2
    .services(VERIFY_SID)
    .verifications.create({ to: phoneNumber, channel: 'sms' });
  if (socketId) pulse(socketId, 'TWILIO', `OTP dispatched to ${phoneNumber}`);
  return verification.sid;
};

const verifyOTP = async (phoneNumber, code, socketId = null) => {
  const result = await client.verify.v2
    .services(VERIFY_SID)
    .verificationChecks.create({ to: phoneNumber, code });
  const approved = result.status === 'approved';
  if (socketId) pulse(socketId, 'TWILIO', approved ? 'OTP verified — session promoted' : 'OTP rejected');
  return approved;
};

module.exports = { sendOTP, verifyOTP };