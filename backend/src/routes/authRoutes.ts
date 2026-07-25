import express from 'express';
import {
  registerUser,
  loginUser,
  sendSmsCode,
  loginWithSms,
  refreshToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  getProfile,
  getIdentities,
  bindPhone,
  unbindPhone,
  bindEmail,
  unbindEmail,
  setPassword,
  updateProfile,
  updateSettings,
  changePassword,
  deleteAccount,
  getAuditLogs,
} from '../controllers/authController';
import {
  validateRegister,
  validateLogin,
  validateSmsSend,
  validateSmsLogin,
  validateBindPhone,
  validateUnbindPhone,
  validateBindEmail,
  validateUnbindEmail,
  validateSetPassword,
  validateForgotPassword,
  validateResetPassword,
  validateProfileUpdate,
  validateSettingsUpdate,
  validateChangePassword,
  validateDeleteAccount,
} from '../middlewares/validationMiddleware';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/sms/send', validateSmsSend, sendSmsCode);
router.post('/sms/login', validateSmsLogin, loginWithSms);
router.post('/refresh-token', refreshToken);
router.post('/logout', logoutUser);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

// Protected routes
router.get('/profile', protect, getProfile);
router.get('/identities', protect, getIdentities);
router.post('/phone/bind', protect, validateBindPhone, bindPhone);
router.delete('/phone/bind', protect, validateUnbindPhone, unbindPhone);
router.post('/email/bind', protect, validateBindEmail, bindEmail);
router.delete('/email/bind', protect, validateUnbindEmail, unbindEmail);
router.post('/password/set', protect, validateSetPassword, setPassword);
router.put('/profile', protect, validateProfileUpdate, updateProfile);
router.put('/settings', protect, validateSettingsUpdate, updateSettings);
router.put('/change-password', protect, validateChangePassword, changePassword);
router.delete('/account', protect, validateDeleteAccount, deleteAccount);
router.get('/audit-logs', protect, getAuditLogs);

export default router;
