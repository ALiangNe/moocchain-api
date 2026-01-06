import { Router } from 'express';
import { validateRegister, validateLogin, validateUpdateUser } from '../middlewares/userValidation';
import { registerController, loginController, updateUserController } from '../controllers/userController';
import { refreshTokenController, logoutController, getCurrentUserController } from '../controllers/authController';
import { uploadAvatarController, uploadCertificateController } from '../controllers/uploadController';
import { createTeacherApplicationController, approveTeacherApplicationController, getAuditRecordListController } from '../controllers/auditRecordController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadAvatar, uploadCertificate } from '../middlewares/uploadMiddleware';
import { checkRole } from '../middlewares/roleMiddleware';

const router = Router();

// Auth
router.post('/logout', logoutController);
router.post('/refreshToken', refreshTokenController);
router.get('/getCurrentUser', authMiddleware, getCurrentUserController);

// User
router.post('/login', validateLogin, loginController);
router.post('/register', validateRegister, registerController);
router.put('/updateUser', authMiddleware, validateUpdateUser, updateUserController);
router.post('/uploadAvatar', authMiddleware, uploadAvatar.single('avatar'), uploadAvatarController);

// AuditRecord
router.post('/createTeacherApplication', authMiddleware, checkRole(5), createTeacherApplicationController);
router.post('/approveTeacherApplication', authMiddleware, checkRole(0), approveTeacherApplicationController);
router.get('/getAuditRecordList', authMiddleware, getAuditRecordListController);
router.post('/uploadCertificate', authMiddleware, uploadCertificate.single('certificate'), uploadCertificateController);

export default router;

