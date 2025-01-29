import axios from 'axios';

// Create axios instance with default config
const fast2smsApi = axios.create({
  baseURL: 'https://www.fast2sms.com/dev',
  headers: {
    'cache-control': 'no-cache',
    'Content-Type': 'application/json'
  },
  timeout: 5000 // Set timeout to 5 seconds
});

// Use a more efficient OTP storage with TTL
class OTPStorage {
  constructor() {
    this.otps = new Map();
  }

  setOTP(phone, otp) {
    this.otps.set(phone, {
      code: otp,
      timestamp: Date.now(),
      attempts: 0
    });
    
    // Automatically remove OTP after 5 minutes
    setTimeout(() => {
      this.otps.delete(phone);
    }, 5 * 60 * 1000);
  }

  getOTP(phone) {
    return this.otps.get(phone);
  }

  removeOTP(phone) {
    this.otps.delete(phone);
  }
}

const otpStorage = new OTPStorage();

// Optimize OTP generation
const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

const requestOTP = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    const otp = generateOTP();
    const message = `${otp} is your OTP for verification.`;

    const params = {
      authorization: process.env.FAST2SMS_API_KEY,
      sender_id: process.env.FAST2SMS_SENDER_ID,
      message: process.env.FAST2SMS_MESSAGE_ID,
      variables_values: message,
      route: 'dlt',
      numbers: phone
    };

    const response = await fast2smsApi.get('/bulkV2', { 
      params,
      // Enable keep-alive connections
      headers: {
        'Connection': 'keep-alive'
      }
    });

    if (response.data.return) {
      otpStorage.setOTP(phone, otp);
      return res.status(200).json({ success: true, message: 'OTP sent successfully' });
    }
    
    throw new Error('Failed to send OTP');
  } catch (error) {
    console.error('OTP Request Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

const verifyOTP = (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
  }

  const storedOTPData = otpStorage.getOTP(phone);

  if (!storedOTPData) {
    return res.status(400).json({ success: false, message: 'OTP expired or not requested yet.' });
  }

  // Check if OTP is expired (5 minutes)
  if (Date.now() - storedOTPData.timestamp > 5 * 60 * 1000) {
    otpStorage.removeOTP(phone);
    return res.status(400).json({ success: false, message: 'OTP has expired' });
  }

  if (parseInt(otp) === storedOTPData.code) {
    otpStorage.removeOTP(phone);
    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  }

  // Increment failed attempts
  storedOTPData.attempts += 1;
  if (storedOTPData.attempts >= 3) {
    otpStorage.removeOTP(phone);
    return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
  }

  return res.status(400).json({ success: false, message: 'Invalid OTP' });
};

export default {
  requestOTP,
  verifyOTP,
};
