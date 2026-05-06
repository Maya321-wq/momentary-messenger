// Test script for Twilio OTP sending
require('dotenv').config({ path: './server/.env' });
const path = require('path');
const { sendOTP } = require(path.join(__dirname, 'server/src/services/twilioService'));

async function testTwilioOTP() {
  console.log('Testing Twilio OTP sending with verified phone number...');

  // Test with the verified Egyptian phone number
  const testPhone = '+201067774532';

  try {
    console.log(`Sending OTP to: ${testPhone}`);
    const sid = await sendOTP(testPhone);
    console.log(`✅ OTP sent successfully! SID: ${sid}`);
  } catch (error) {
    console.log(`❌ OTP sending failed: ${error.message}`);
    console.log('Error details:', error);
  }
}

testTwilioOTP();