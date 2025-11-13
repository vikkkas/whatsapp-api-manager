import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Templates endpoint - coming soon'
    });
});
export default router;
//# sourceMappingURL=templates.js.map