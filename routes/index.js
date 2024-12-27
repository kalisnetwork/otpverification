import express from 'express';
import otpController from '../controllers/otpController.js';

const router = express.Router();

// OTP routes
router.post('/request-otp', otpController.requestOTP);
router.post('/verify-otp', otpController.verifyOTP);

export default router;
