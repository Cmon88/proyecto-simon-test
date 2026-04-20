import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const prompts = await prisma.prompt.findMany({
      where: { orgId: req.auth!.org_id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(prompts);
  }),
);

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  content: z.string().min(1).max(4000),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = CreateBody.parse(req.body);
    const p = await prisma.prompt.create({
      data: { ...b, orgId: req.auth!.org_id, isDefault: false },
    });
    res.status(201).json(p);
  }),
);

router.post(
  '/:id/set-default',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const p = await prisma.prompt.findFirst({ where: { id: req.params.id, orgId } });
    if (!p) return res.status(404).json({ error: 'not_found' });
    await prisma.$transaction([
      prisma.prompt.updateMany({ where: { orgId }, data: { isDefault: false } }),
      prisma.prompt.update({ where: { id: req.params.id }, data: { isDefault: true } }),
    ]);
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const p = await prisma.prompt.findFirst({ where: { id: req.params.id, orgId } });
    if (!p) return res.status(404).json({ error: 'not_found' });
    if (p.isDefault) return res.status(400).json({ error: 'cannot_delete_default' });
    await prisma.prompt.delete({ where: { id: p.id } });
    res.json({ ok: true });
  }),
);

export default router;
