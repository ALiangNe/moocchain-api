import { Router } from 'express';
import { validateRegister, validateLogin } from '../middlewares/userValidation';
import { registerController, loginController } from '../controllers/userController';
import { refreshTokenController, logoutController } from '../controllers/authController';

const router = Router();

// Auth
router.post('/logout', logoutController);
router.post('/refresh', refreshTokenController);

// User
router.post('/login', validateLogin, loginController);
router.post('/register', validateRegister, registerController);

export default router;

