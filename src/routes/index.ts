import { Router } from 'express';
import { registerController, loginController, updateUserController } from '../controllers/userController';
import { refreshTokenController, logoutController, getCurrentUserController } from '../controllers/authController';
import { uploadAvatarController, uploadCertificateController } from '../controllers/uploadController';
import { createTeacherApplicationController, approveTeacherApplicationController, approveResourceApplicationController, approveCourseApplicationController, getAuditRecordListController, reapplyCourseAuditController, reapplyResourceAuditController } from '../controllers/auditRecordController';
import { createCourseController, updateCourseController, getCourseListController, getCourseController } from '../controllers/courseController';
import { createResourceController, updateResourceController, getResourceListController, getResourceController } from '../controllers/resourceController';
import { completeLearningRecordController, reportLearningTimeController, updateLearningProgressController, submitReviewController, getLearningRecordListController, getLearningRecordController, getLearningHistoryListController } from '../controllers/learningRecordController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadAvatar, uploadCertificate, uploadResource, uploadCourseCover } from '../middlewares/uploadMiddleware';
import { checkRole } from '../middlewares/roleMiddleware';

const router = Router();

// Auth
router.post('/logout', logoutController);
router.post('/refreshToken', refreshTokenController);
router.get('/getCurrentUser', authMiddleware, getCurrentUserController);

// User
router.post('/login', loginController);
router.post('/register', registerController);
router.put('/updateUser', authMiddleware, updateUserController);
router.post('/uploadAvatar', authMiddleware, uploadAvatar.single('avatar'), uploadAvatarController);

// AuditRecord
router.post('/createTeacherApplication', authMiddleware, checkRole(5), createTeacherApplicationController);
router.post('/uploadCertificate', authMiddleware, uploadCertificate.single('certificate'), uploadCertificateController);
router.post('/approveTeacherApplication', authMiddleware, checkRole(0), approveTeacherApplicationController);
router.post('/approveResourceApplication', authMiddleware, checkRole(0), approveResourceApplicationController);
router.post('/approveCourseApplication', authMiddleware, checkRole(0), approveCourseApplicationController);
router.post('/reapplyCourseAudit', authMiddleware, checkRole(0, 4), reapplyCourseAuditController);
router.post('/reapplyResourceAudit', authMiddleware, checkRole(0, 4), reapplyResourceAuditController);
router.get('/getAuditRecordList', authMiddleware, getAuditRecordListController);

// Course
router.post('/createCourse', authMiddleware, checkRole(0, 4), uploadCourseCover.single('coverImage'), createCourseController);
router.put('/updateCourse/:courseId', authMiddleware, checkRole(0, 4), uploadCourseCover.single('coverImage'), updateCourseController);
router.get('/getCourseList', authMiddleware, getCourseListController);
router.get('/getCourse/:courseId', authMiddleware, getCourseController);

// Resource
router.post('/createResource', authMiddleware, checkRole(0, 4), uploadResource.single('file'), createResourceController);
router.put('/updateResource/:resourceId', authMiddleware, checkRole(0, 4), updateResourceController);
router.get('/getResourceList', authMiddleware, getResourceListController);
router.get('/getResource/:resourceId', authMiddleware, getResourceController);

// LearningRecord
router.post('/completeLearningRecord', authMiddleware, completeLearningRecordController);
router.post('/reportLearningTime', authMiddleware, reportLearningTimeController);
router.put('/updateLearningProgress/:resourceId', authMiddleware, updateLearningProgressController);
router.post('/submitReview', authMiddleware, submitReviewController);
router.get('/getLearningRecordList', authMiddleware, getLearningRecordListController);
router.get('/getLearningRecord/:recordId', authMiddleware, getLearningRecordController);
router.get('/getLearningHistoryList', authMiddleware, getLearningHistoryListController);

export default router;

