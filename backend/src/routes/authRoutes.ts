import express from 'express';
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  updateSettings,
  changePassword,
} from '../controllers/authController';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProfileUpdate,
  validateSettingsUpdate,
  validateChangePassword,
} from '../middlewares/validationMiddleware';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateProfileUpdate, updateProfile);
router.put('/settings', protect, validateSettingsUpdate, updateSettings);
router.put('/change-password', protect, validateChangePassword, changePassword);
router.post('/logout', protect, logoutUser);

export default router;
