import express from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/authController';
import { validateRegister, validateLogin } from '../middlewares/validationMiddleware';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', protect, logoutUser);

export default router;
