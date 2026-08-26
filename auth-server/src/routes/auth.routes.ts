import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Public User Auth endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Public Admin Auth endpoint
router.post('/admin/login', AuthController.adminLogin);

// Protected Auth endpoints
router.get('/me', authenticateJWT, AuthController.getMe);
router.post('/logout', authenticateJWT, AuthController.logout);

export default router;
