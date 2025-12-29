import { Router } from 'express';
import { registerController, loginController } from '../controllers/userController';
import { validateRegister, validateLogin } from '../middlewares/userValidation';

const router = Router();

router.post('/login', validateLogin, loginController);
router.post('/register', validateRegister, registerController);

export default router;

