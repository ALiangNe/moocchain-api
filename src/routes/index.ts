import { Router } from 'express';
import { validateRegister, validateLogin } from '../middlewares/userValidation';
import { validateUserId } from '../middlewares/authValidation';
import { registerController, loginController } from '../controllers/userController';
import { refreshTokenController, logoutController, getCurrentUserController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Auth
router.post('/logout', logoutController);
router.post('/refresh', refreshTokenController);
router.get('/me', authMiddleware, validateUserId, getCurrentUserController);

// User
router.post('/login', validateLogin, loginController);
router.post('/register', validateRegister, registerController);

export default router;

