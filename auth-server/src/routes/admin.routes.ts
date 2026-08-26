import { Router, Response } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Protect all admin routes with JWT & Admin role
router.use(authenticateJWT);
router.use(requireRole('admin'));

// Test admin authorization route
router.get('/test', (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the protected Admin API endpoint',
    adminUser: req.user,
  });
});

export default router;
