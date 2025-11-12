import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented with full controllers
router.get('/', (req, res) => {
  res.json({ 
    success: true,
    data: [],
    message: 'Templates endpoint - coming soon'
  });
});

export default router;
