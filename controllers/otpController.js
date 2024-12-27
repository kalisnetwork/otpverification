import axios from 'axios';

const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000);
};

const otpStorage = {};

const fast2smsApi = axios.create({
  baseURL: 'https://www.fast2sms.com/dev',
});

const requestOTP = async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: "false", message: 'Phone number is required' });
    }

    const otp = generateOTP();
    otpStorage[phone] = otp;
    const message = `${otp} is your OTP for verification.`;
    const numbers = phone;

    try {
      const params = {
        authorization: process.env.FAST2SMS_API_KEY,
        sender_id: process.env.FAST2SMS_SENDER_ID,
        message: process.env.FAST2SMS_MESSAGE_ID,
        variables_values: message,
        route: 'dlt',
        numbers,
      };
      const response = await fast2smsApi.get('/bulkV2', { params });

      if (response.data.return) {
        return res.status(200).json({ success: "true", message: 'OTP sent successfully' });
      } else {
        return res.status(500).json({ success: "false", message: 'Failed to send OTP using fast2sms' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: "false", message: 'Failed to send OTP' });
    }
};

const verifyOTP = (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: "false", message: 'Phone number and OTP are required' });
    }

    const storedOTP = otpStorage[phone];

    if (!storedOTP) {
      return res.status(400).json({ success: "false", message: 'OTP expired or not requested yet.' });
    }

    if (parseInt(otp) === storedOTP) {
      delete otpStorage[phone];
      return res.status(200).json({ success: "true", message: 'OTP verified successfully' });
    } else {
      return res.status(400).json({ success: "false", message: 'Invalid OTP' });
    }
};

export default {
    requestOTP,
    verifyOTP,
};
