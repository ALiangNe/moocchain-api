import { Router } from 'express';
import { validateRegister, validateLogin, validateUpdateUser } from '../middlewares/userValidation';
import { registerController, loginController, updateUserController } from '../controllers/userController';
import { refreshTokenController, logoutController, getCurrentUserController } from '../controllers/authController';
import { uploadAvatarController } from '../controllers/uploadController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadAvatar } from '../middlewares/uploadMiddleware';

const router = Router();

// Auth
router.post('/logout', logoutController);
router.post('/refresh', refreshTokenController);
router.get('/me', authMiddleware, getCurrentUserController);

// User
router.post('/login', validateLogin, loginController);
router.post('/register', validateRegister, registerController);
router.put('/updateUser', authMiddleware, validateUpdateUser, updateUserController);
router.post('/uploadAvatar', authMiddleware, uploadAvatar.single('avatar'), uploadAvatarController);

export default router;

