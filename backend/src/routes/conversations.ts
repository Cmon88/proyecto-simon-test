import { Router } from 'express';
import { z } from 'zod';
import { Channel, ConversationStatus, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToOrg } from '../ws/index.js';

const router = Router();
router.use(requireAuth);

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.nativeEnum(ConversationStatus).optional(),
  channel: z.nativeEnum(Channel).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
});

// List conversations — tenant-scoped, paginated, filterable.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = ListQuery.parse(req.query);
    const where: Prisma.ConversationWhereInput = { orgId: req.auth!.org_id };
    if (q.from || q.to) where.startedAt = { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined };
    if (q.status) where.status = q.status;
    if (q.channel) where.channel = q.channel;
    if (q.minRating !== undefined) where.rating = { gte: q.minRating };

    const [total, items] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true, title: true, channel: true, status: true, rating: true,
          startedAt: true, endedAt: true,
          _count: { select: { messages: true } },
        },
      }),
    ]);

    res.json({
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        channel: c.channel,
        status: c.status,
        rating: c.rating,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        durationSec: c.endedAt ? Math.round((c.endedAt.getTime() - c.startedAt.getTime()) / 1000) : null,
        messageCount: c._count.messages,
      })),
    });
  }),
);

// Detail — includes full message history, tenant-scoped.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const c = await prisma.conversation.findFirst({
      where: { id: req.params.id, orgId: req.auth!.org_id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) return res.status(404).json({ error: 'not_found' });
    res.json(c);
  }),
);

// Create new conversation (default channel WEB).
const CreateBody = z.object({
  title: z.string().max(200).optional(),
  channel: z.nativeEnum(Channel).default(Channel.WEB),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = CreateBody.parse(req.body);
    const conv = await prisma.conversation.create({
      data: {
        orgId: req.auth!.org_id,
        title: body.title ?? `Conversación ${new Date().toLocaleString('es-CL')}`,
        channel: body.channel,
        status: ConversationStatus.OPEN,
      },
    });
    emitToOrg(req.auth!.org_id, 'conversation:created', {
      id: conv.id,
      title: conv.title,
      channel: conv.channel,
      status: conv.status,
      rating: conv.rating,
      startedAt: conv.startedAt,
      endedAt: conv.endedAt,
      durationSec: null,
      messageCount: 0,
    });
    res.status(201).json(conv);
  }),
);

// Rate a conversation (1..5).
const RateBody = z.object({ rating: z.number().int().min(1).max(5) });
router.post(
  '/:id/rate',
  asyncHandler(async (req, res) => {
    const { rating } = RateBody.parse(req.body);
    const result = await prisma.conversation.updateMany({
      where: { id: req.params.id, orgId: req.auth!.org_id },
      data: { rating },
    });
    if (result.count === 0) return res.status(404).json({ error: 'not_found' });
    emitToOrg(req.auth!.org_id, 'conversation:updated', { id: req.params.id, rating });
    res.json({ ok: true });
  }),
);

// Close a conversation.
router.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const result = await prisma.conversation.updateMany({
      where: { id: req.params.id, orgId: req.auth!.org_id },
      data: { status: ConversationStatus.CLOSED, endedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ error: 'not_found' });
    emitToOrg(req.auth!.org_id, 'conversation:updated', {
      id: req.params.id,
      status: ConversationStatus.CLOSED,
    });
    res.json({ ok: true });
  }),
);

// Delete a conversation (tenant-scoped).
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await prisma.conversation.deleteMany({
      where: { id: req.params.id, orgId: req.auth!.org_id },
    });
    if (result.count === 0) return res.status(404).json({ error: 'not_found' });
    emitToOrg(req.auth!.org_id, 'conversation:deleted', { id: req.params.id });
    res.json({ ok: true });
  }),
);

export default router;
