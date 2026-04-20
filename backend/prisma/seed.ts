import { PrismaClient, Channel, ConversationStatus, MessageRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PROMPTS = [
  {
    name: 'Asistente amable',
    content: 'Eres un asistente amable, profesional y cercano. Respondes en español, breve y claro.',
    isDefault: true,
  },
  {
    name: 'Joven simpático',
    content: 'Eres un joven millennial simpático. Usas lenguaje casual, emojis ocasionales y eres muy empático.',
    isDefault: false,
  },
  {
    name: 'Viejo tradicional',
    content: 'Eres un señor mayor muy formal y tradicional. Hablas con mucho respeto, frases largas y educadas.',
    isDefault: false,
  },
  {
    name: 'Gringo aprendiendo',
    content: 'You are an American who is learning Spanish. Mix English and Spanish, with some cute grammar mistakes in Spanish. Keep it friendly.',
    isDefault: false,
  },
];

async function ensureOrg(name: string) {
  return prisma.organization.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function ensureUser(email: string, name: string, password: string, orgId: string, avatarUrl?: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, orgId, avatarUrl },
    create: { email, name, passwordHash, orgId, avatarUrl },
  });
}

async function ensurePrompts(orgId: string) {
  for (const p of DEFAULT_PROMPTS) {
    await prisma.prompt.upsert({
      where: { orgId_name: { orgId, name: p.name } },
      update: { content: p.content, isDefault: p.isDefault },
      create: { ...p, orgId },
    });
  }
}

function randomChannel(): Channel {
  const r = Math.random();
  if (r < 0.6) return Channel.WEB;
  if (r < 0.85) return Channel.WHATSAPP;
  return Channel.INSTAGRAM;
}

async function seedConversations(orgId: string, count: number) {
  const prompts = await prisma.prompt.findMany({ where: { orgId } });
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 28);
    const startedAt = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000));
    const durationSec = 30 + Math.floor(Math.random() * 600);
    const endedAt = new Date(startedAt.getTime() + durationSec * 1000);
    const isClosed = Math.random() < 0.75;
    const rating = Math.random() < 0.85 ? 1 + Math.floor(Math.random() * 5) : null;
    const channel = randomChannel();
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    const conv = await prisma.conversation.create({
      data: {
        orgId,
        title: `Consulta #${i + 1}`,
        channel,
        status: isClosed ? ConversationStatus.CLOSED : ConversationStatus.OPEN,
        rating,
        startedAt,
        endedAt: isClosed ? endedAt : null,
      },
    });

    const turns = 2 + Math.floor(Math.random() * 4);
    let t = startedAt.getTime();
    for (let j = 0; j < turns; j++) {
      t += 5000 + Math.floor(Math.random() * 20000);
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          orgId,
          role: MessageRole.USER,
          content: `Hola, tengo una consulta sobre mi pedido #${Math.floor(Math.random() * 9999)}`,
          createdAt: new Date(t),
        },
      });
      t += 1000 + Math.floor(Math.random() * 4000);
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          orgId,
          role: MessageRole.ASSISTANT,
          content: 'Claro, con gusto te ayudo. ¿Me puedes dar más detalles?',
          promptId: prompt?.id ?? null,
          latencyMs: 400 + Math.floor(Math.random() * 2500),
          createdAt: new Date(t),
        },
      });
    }
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  const acme = await ensureOrg('Acme Corp');
  const globex = await ensureOrg('Globex');

  await ensureUser(
    'alice@acme.com',
    'Alice (Acme)',
    'password123',
    acme.id,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
  );
  await ensureUser(
    'bob@globex.com',
    'Bob (Globex)',
    'password123',
    globex.id,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
  );

  await ensurePrompts(acme.id);
  await ensurePrompts(globex.id);

  const acmeConvCount = await prisma.conversation.count({ where: { orgId: acme.id } });
  if (acmeConvCount === 0) await seedConversations(acme.id, 45);

  const globexConvCount = await prisma.conversation.count({ where: { orgId: globex.id } });
  if (globexConvCount === 0) await seedConversations(globex.id, 25);

  console.log('✅ Seed complete.');
  console.log('   alice@acme.com / password123  (Org: Acme Corp)');
  console.log('   bob@globex.com / password123  (Org: Globex)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
