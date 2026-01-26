import { Router } from 'express';
import { registerController, loginController, updateUserController, getUserListController, adminUpdateUserController } from '../controllers/userController';
import { refreshTokenController, logoutController, getCurrentUserController } from '../controllers/authController';
import { uploadAvatarController, uploadCertificateController } from '../controllers/uploadController';
import { createTeacherApplicationController, approveTeacherApplicationController, approveResourceApplicationController, approveCourseApplicationController, getAuditRecordListController, reapplyCourseAuditController, reapplyResourceAuditController } from '../controllers/auditRecordController';
import { createCourseController, updateCourseController, getCourseListController, getCourseController } from '../controllers/courseController';
import { createResourceController, updateResourceController, getResourceListController, getResourceController, claimResourceUploadRewardController, buyResourceController } from '../controllers/resourceController';
import { completeLearningRecordController, reportLearningTimeController, updateLearningProgressController, submitReviewController, getLearningRecordListController, getLearningRecordController, getLearningHistoryListController, claimLearningRewardController } from '../controllers/learningRecordController';
import { createCertificateTemplateController, updateCertificateTemplateController, getCertificateTemplateListController, getCertificateTemplateController } from '../controllers/certificateTemplateController';
import { createResourceCertificateConfigController, updateResourceCertificateConfigController, getResourceCertificateConfigListController, getResourceCertificateConfigController } from '../controllers/resourceCertificateConfigController';
import { createCertificateController, getCertificateListController, getCertificateController, updateCertificateNftController } from '../controllers/certificateController';
import { createTokenRuleController, updateTokenRuleController, getTokenRuleListController, getTokenRuleController } from '../controllers/tokenRuleController';
import { getTokenTransactionListController } from '../controllers/tokenTransactionController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadAvatar, uploadCertificate, uploadResource, uploadCourseCover } from '../middlewares/uploadMiddleware';
import { checkRole } from '../middlewares/roleMiddleware';
import { validateCertificateTemplateMiddleware } from '../middlewares/certificateTemplateValidationMiddleware';

const router = Router();

// Auth
router.post('/logout', logoutController);
router.post('/refreshToken', refreshTokenController);
router.get('/getCurrentUser', authMiddleware, getCurrentUserController);

// User
router.post('/login', loginController);
router.post('/register', registerController);
router.put('/updateUser', authMiddleware, updateUserController);
router.get('/getUserList', authMiddleware, checkRole(0), getUserListController);
router.put('/adminUpdateUser/:userId', authMiddleware, checkRole(0), adminUpdateUserController);
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
router.post('/claimResourceUploadReward', authMiddleware, checkRole(0, 4), claimResourceUploadRewardController);
router.post('/buyResource', authMiddleware, buyResourceController);

// LearningRecord
router.post('/completeLearningRecord', authMiddleware, completeLearningRecordController);
router.post('/reportLearningTime', authMiddleware, reportLearningTimeController);
router.put('/updateLearningProgress/:resourceId', authMiddleware, updateLearningProgressController);
router.post('/submitReview', authMiddleware, submitReviewController);
router.get('/getLearningRecordList', authMiddleware, getLearningRecordListController);
router.get('/getLearningRecord/:recordId', authMiddleware, getLearningRecordController);
router.get('/getLearningHistoryList', authMiddleware, getLearningHistoryListController);
router.post('/claimLearningReward', authMiddleware, claimLearningRewardController);

// CertificateTemplate
router.post('/createCertificateTemplate', authMiddleware, checkRole(0), validateCertificateTemplateMiddleware, createCertificateTemplateController);
router.put('/updateCertificateTemplate/:templateId', authMiddleware, checkRole(0), validateCertificateTemplateMiddleware, updateCertificateTemplateController);
router.get('/getCertificateTemplateList', authMiddleware, getCertificateTemplateListController);
router.get('/getCertificateTemplate/:templateId', authMiddleware, getCertificateTemplateController);

// ResourceCertificateConfig
router.post('/createResourceCertificateConfig', authMiddleware, checkRole(4), createResourceCertificateConfigController);
router.put('/updateResourceCertificateConfig/:configId', authMiddleware, checkRole(4), updateResourceCertificateConfigController);
router.get('/getResourceCertificateConfigList', authMiddleware, checkRole(0, 4, 5), getResourceCertificateConfigListController);
router.get('/getResourceCertificateConfig/:configId', authMiddleware, checkRole(0, 4), getResourceCertificateConfigController);

// Certificate
router.post('/createCertificate', authMiddleware, checkRole(5), createCertificateController);
router.get('/getCertificateList', authMiddleware, getCertificateListController);
router.get('/getCertificate/:certificateId', authMiddleware, getCertificateController);
router.put('/updateCertificateNft/:certificateId', authMiddleware, checkRole(5), updateCertificateNftController);

// TokenRule
router.post('/createTokenRule', authMiddleware, checkRole(0), createTokenRuleController);
router.put('/updateTokenRule/:ruleId', authMiddleware, checkRole(0), updateTokenRuleController);
router.get('/getTokenRuleList', authMiddleware, getTokenRuleListController);
router.get('/getTokenRule/:ruleId', authMiddleware, getTokenRuleController);

// TokenTransaction
router.get('/getTokenTransactionList', authMiddleware, getTokenTransactionListController);

export default router;

