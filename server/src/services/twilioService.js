const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const sendOTP = async (phoneNumber) => {
  const verification = await client.verify.v2
    .services(VERIFY_SID)
    .verifications.create({ to: phoneNumber, channel: 'sms' });
  return verification.sid;
};

const verifyOTP = async (phoneNumber, code) => {
  const result = await client.verify.v2
    .services(VERIFY_SID)
    .verificationChecks.create({ to: phoneNumber, code });
  return result.status === 'approved';
};

module.exports = { sendOTP, verifyOTP };