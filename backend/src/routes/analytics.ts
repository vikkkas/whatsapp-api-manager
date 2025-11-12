import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented with full controllers
router.get('/', (_req, res) => {
  res.json({ 
    success: true,
    data: {},
    message: 'Analytics endpoint - coming soon'
  });
});

export default router;
