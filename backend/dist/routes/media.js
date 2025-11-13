import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
const router = Router();
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/media');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        const filename = `${uniqueId}${ext}`;
        cb(null, filename);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/3gpp',
        'video/quicktime',
        'audio/mpeg',
        'audio/ogg',
        'audio/amr',
        'audio/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not supported`));
    }
};
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 16 * 1024 * 1024,
    },
});
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }
        const { type } = req.body;
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
        const fileUrl = `${baseUrl}/api/media/files/${req.file.filename}`;
        logger.info('File uploaded', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            type,
            tenantId: req.tenant?.id,
        });
        res.json({
            success: true,
            data: {
                url: fileUrl,
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                type: type || 'document',
            },
        });
    }
    catch (error) {
        logger.error('File upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload file',
        });
    }
});
router.post('/upload-multiple', authenticate, upload.array('files', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded',
            });
        }
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
        const uploadedFiles = files.map(file => ({
            url: `${baseUrl}/api/media/files/${file.filename}`,
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        }));
        logger.info('Multiple files uploaded', {
            count: files.length,
            tenantId: req.tenant?.id,
        });
        res.json({
            success: true,
            data: {
                files: uploadedFiles,
                count: files.length,
            },
        });
    }
    catch (error) {
        logger.error('Multiple file upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload files',
        });
    }
});
router.get('/files/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../uploads/media', filename);
        try {
            await fs.access(filePath);
        }
        catch {
            return res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }
        res.sendFile(filePath);
    }
    catch (error) {
        logger.error('File serve error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to serve file',
        });
    }
});
router.delete('/files/:filename', authenticate, async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../uploads/media', filename);
        try {
            await fs.access(filePath);
        }
        catch {
            return res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }
        await fs.unlink(filePath);
        logger.info('File deleted', {
            filename,
            tenantId: req.tenant?.id,
        });
        res.json({
            success: true,
            message: 'File deleted successfully',
        });
    }
    catch (error) {
        logger.error('File delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete file',
        });
    }
});
router.get('/info/:filename', authenticate, async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../../uploads/media', filename);
        const stats = await fs.stat(filePath);
        res.json({
            success: true,
            data: {
                filename,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
            },
        });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'File not found',
            });
        }
        logger.error('File info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get file info',
        });
    }
});
export default router;
//# sourceMappingURL=media.js.map