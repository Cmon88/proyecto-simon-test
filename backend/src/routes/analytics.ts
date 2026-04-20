import { Router } from 'express';
import { MessageRole, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// Summary KPIs for the "Resumen" view.
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now); startOfMonth.setDate(now.getDate() - 30);

    const [today, week, month, ratingAgg, latencyAgg, ratedCount, satisfactory] = await Promise.all([
      prisma.conversation.count({ where: { orgId, startedAt: { gte: startOfDay } } }),
      prisma.conversation.count({ where: { orgId, startedAt: { gte: startOfWeek } } }),
      prisma.conversation.count({ where: { orgId, startedAt: { gte: startOfMonth } } }),
      prisma.conversation.aggregate({
        where: { orgId, rating: { not: null } },
        _avg: { rating: true },
      }),
      prisma.message.aggregate({
        where: { orgId, role: MessageRole.ASSISTANT, latencyMs: { not: null } },
        _avg: { latencyMs: true },
      }),
      prisma.conversation.count({ where: { orgId, rating: { not: null } } }),
      prisma.conversation.count({ where: { orgId, rating: { gte: 4 } } }),
    ]);

    res.json({
      conversations: { today, week, month },
      satisfactionRate: ratedCount === 0 ? null : satisfactory / ratedCount,
      avgRating: ratingAgg._avg.rating,
      avgLatencySec: latencyAgg._avg.latencyMs ? latencyAgg._avg.latencyMs / 1000 : null,
    });
  }),
);

// Daily volume trend over last 30 days.
router.get(
  '/trend',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const days = 30;
    const rows: { day: Date; count: bigint }[] = await prisma.$queryRaw(
      Prisma.sql`
        SELECT date_trunc('day', "startedAt") AS day, COUNT(*)::bigint AS count
        FROM "Conversation"
        WHERE "orgId" = ${orgId}
          AND "startedAt" >= NOW() - (${days}::int * INTERVAL '1 day')
        GROUP BY 1 ORDER BY 1 ASC
      `,
    );
    const byDay: Record<string, number> = {};
    for (const r of rows) byDay[r.day.toISOString().slice(0, 10)] = Number(r.count);

    const out: { date: string; count: number }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: byDay[key] ?? 0 });
    }
    res.json(out);
  }),
);

// Rating distribution histogram (1..5) with percentages.
router.get(
  '/ratings',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const grouped = await prisma.conversation.groupBy({
      by: ['rating'],
      where: { orgId, rating: { not: null } },
      _count: { _all: true },
    });
    const total = grouped.reduce((s, g) => s + g._count._all, 0);
    const buckets = [1, 2, 3, 4, 5].map((n) => {
      const g = grouped.find((x) => x.rating === n);
      const count = g?._count._all ?? 0;
      return { rating: n, count, percentage: total === 0 ? 0 : count / total };
    });
    res.json({ total, buckets });
  }),
);

// Channel distribution (pie).
router.get(
  '/channels',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const grouped = await prisma.conversation.groupBy({
      by: ['channel'],
      where: { orgId },
      _count: { _all: true },
    });
    const total = grouped.reduce((s, g) => s + g._count._all, 0);
    res.json({
      total,
      items: grouped.map((g) => ({
        channel: g.channel,
        count: g._count._all,
        percentage: total === 0 ? 0 : g._count._all / total,
      })),
    });
  }),
);

// Top 5 prompts with worst avg rating (requires ≥ N samples).
router.get(
  '/worst-prompts',
  asyncHandler(async (req, res) => {
    const orgId = req.auth!.org_id;
    const rows: Array<{ promptId: string; name: string; avg_rating: number; samples: bigint }> =
      await prisma.$queryRaw(Prisma.sql`
        SELECT p.id AS "promptId", p.name, AVG(c.rating)::float AS avg_rating, COUNT(DISTINCT c.id)::bigint AS samples
        FROM "Message" m
        JOIN "Prompt" p ON p.id = m."promptId"
        JOIN "Conversation" c ON c.id = m."conversationId"
        WHERE m."orgId" = ${orgId}
          AND m.role = 'ASSISTANT'
          AND c.rating IS NOT NULL
          AND m."promptId" IS NOT NULL
        GROUP BY p.id, p.name
        HAVING COUNT(DISTINCT c.id) >= 1
        ORDER BY avg_rating ASC
        LIMIT 5
      `);
    res.json(
      rows.map((r) => ({
        promptId: r.promptId,
        name: r.name,
        avgRating: r.avg_rating,
        samples: Number(r.samples),
      })),
    );
  }),
);

export default router;
