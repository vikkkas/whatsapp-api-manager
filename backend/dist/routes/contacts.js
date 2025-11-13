import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { Parser } from 'json2csv';
const router = Router();
router.use(authenticate);
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (search) {
            where.OR = [
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { conversations: true },
                    },
                },
            }),
            prisma.contact.count({ where }),
        ]);
        const contactsWithLastMessage = await Promise.all(contacts.map(async (contact) => {
            const lastConversation = await prisma.conversation.findFirst({
                where: {
                    tenantId: req.user?.tenantId,
                },
                orderBy: { lastMessageAt: 'desc' },
                select: { lastMessageAt: true },
            });
            return {
                id: contact.id,
                phoneNumber: contact.phoneNumber,
                name: contact.name,
                email: contact.email,
                company: contact.company,
                tags: contact.tags,
                notes: contact.notes,
                totalMessages: contact._count.conversations,
                lastMessageAt: lastConversation?.lastMessageAt,
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
            };
        }));
        res.json({
            success: true,
            contacts: contactsWithLastMessage,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        log.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts',
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const contact = await prisma.contact.findFirst({
            where: { id, tenantId },
            include: {
                conversations: {
                    orderBy: { lastMessageAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found',
            });
        }
        res.json({
            success: true,
            contact,
        });
    }
    catch (error) {
        log.error('Error fetching contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contact',
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { phoneNumber, name, email, company, notes, tags } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required',
            });
        }
        const existing = await prisma.contact.findFirst({
            where: { phoneNumber, tenantId },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Contact with this phone number already exists',
            });
        }
        const contact = await prisma.contact.create({
            data: {
                phoneNumber,
                name: name || null,
                email: email || null,
                company: company || null,
                notes: notes || null,
                tags: tags || [],
                tenantId,
            },
        });
        log.info('Contact created', { contactId: contact.id, tenantId });
        res.status(201).json({
            success: true,
            contact,
        });
    }
    catch (error) {
        log.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create contact',
        });
    }
});
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const { phoneNumber, name, email, company, notes, tags } = req.body;
        const existing = await prisma.contact.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found',
            });
        }
        const contact = await prisma.contact.update({
            where: { id },
            data: {
                phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email : undefined,
                company: company !== undefined ? company : undefined,
                notes: notes !== undefined ? notes : undefined,
                tags: tags !== undefined ? tags : undefined,
            },
        });
        log.info('Contact updated', { contactId: id, tenantId });
        res.json({
            success: true,
            contact,
        });
    }
    catch (error) {
        log.error('Error updating contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update contact',
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const existing = await prisma.contact.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found',
            });
        }
        await prisma.contact.delete({
            where: { id },
        });
        log.info('Contact deleted', { contactId: id, tenantId });
        res.json({
            success: true,
            message: 'Contact deleted successfully',
        });
    }
    catch (error) {
        log.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete contact',
        });
    }
});
router.get('/export/csv', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const contacts = await prisma.contact.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
        const fields = ['phoneNumber', 'name', 'email', 'company', 'notes', 'tags', 'createdAt'];
        const parser = new Parser({ fields });
        const csv = parser.parse(contacts);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
        res.send(csv);
    }
    catch (error) {
        log.error('Error exporting contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export contacts',
        });
    }
});
router.post('/import/csv', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { contacts } = req.body;
        if (!Array.isArray(contacts)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid data format',
            });
        }
        const created = [];
        const errors = [];
        for (const contactData of contacts) {
            try {
                const { phoneNumber, name, email, company, notes, tags } = contactData;
                if (!phoneNumber) {
                    errors.push({ data: contactData, error: 'Phone number required' });
                    continue;
                }
                const existing = await prisma.contact.findFirst({
                    where: { phoneNumber, tenantId },
                });
                if (existing) {
                    errors.push({ data: contactData, error: 'Contact already exists' });
                    continue;
                }
                const contact = await prisma.contact.create({
                    data: {
                        phoneNumber,
                        name: name || null,
                        email: email || null,
                        company: company || null,
                        notes: notes || null,
                        tags: tags || [],
                        tenantId,
                    },
                });
                created.push(contact);
            }
            catch (err) {
                errors.push({ data: contactData, error: String(err) });
            }
        }
        log.info('Contacts imported', {
            count: created.length,
            errors: errors.length,
            tenantId
        });
        res.json({
            success: true,
            created: created.length,
            errors: errors.length,
            errorDetails: errors,
        });
    }
    catch (error) {
        log.error('Error importing contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import contacts',
        });
    }
});
export default router;
//# sourceMappingURL=contacts.js.map