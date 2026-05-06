// Test script for phone number normalization
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Phone number is required and must be a string');
  }

  let cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');

  // If it doesn't start with +, assume it's a local number and add country code
  if (!cleaned.startsWith('+')) {
    // Handle common formats:
    // - If starts with 0 (Egypt), convert to +20
    if (cleaned.startsWith('0')) {
      cleaned = '+20' + cleaned.substring(1);
    }
    // - If starts with 1 (US), convert to +1
    else if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+1' + cleaned;
    }
    // - Otherwise, assume international format is missing +
    else {
      cleaned = '+' + cleaned;
    }
  }

  // Validate E.164 format: + followed by country code and number
  if (!cleaned.startsWith('+') || cleaned.length < 10) {
    throw new Error('Phone number must be in E.164 format (+[country code][number]) and at least 10 digits');
  }

  // Additional validation: ensure it contains only digits after +
  const digitsOnly = cleaned.substring(1);
  if (!/^\d+$/.test(digitsOnly)) {
    throw new Error('Phone number can only contain digits after the +');
  }

  return cleaned;
};

// Test cases
const testCases = [
  '01234567890',  // Egyptian number starting with 0
  '+201234567890', // Already formatted Egyptian number
  '1234567890',   // US number without +
  '+11234567890', // Already formatted US number
  '+441234567890', // UK number
  '012 345 678 90', // Egyptian with spaces
  '(012) 345-6789', // US with formatting
];

console.log('Testing phone number normalization:');
testCases.forEach((testCase, index) => {
  try {
    const result = normalizePhoneNumber(testCase);
    console.log(`Test ${index + 1}: "${testCase}" → "${result}" ✅`);
  } catch (error) {
    console.log(`Test ${index + 1}: "${testCase}" → ERROR: ${error.message} ❌`);
  }
});