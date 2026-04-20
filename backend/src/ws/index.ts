import { Server as HttpServer } from 'http';
import { Server as IoServer, Socket } from 'socket.io';
import { MessageRole } from '@prisma/client';
import { verifyToken } from '../auth/middleware.js';
import { prisma } from '../db.js';
import { streamChat, ChatTurn } from '../ai/client.js';
import { wsActiveConnections } from '../metrics.js';

let io: IoServer | null = null;

export function emitToOrg(orgId: string, event: string, payload: unknown) {
  io?.to(`org:${orgId}`).emit(event, payload);
}

export function initSocket(server: HttpServer) {
  io = new IoServer(server, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });

  // Auth middleware — JWT injected from handshake headers.
  // This physically blocks unauthorized connections or unauthenticated sockets before connection.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== 'string') return next(new Error('missing_token'));
    try {
      const claims = verifyToken(token);
      (socket.data as any).auth = claims;
      next();
    } catch {
      next(new Error('invalid_token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const claims = (socket.data as any).auth as { sub: string; org_id: string; email: string; name: string };
    
    // STRICT TENANT ISOLATION: 
    // Join the socket globally to an org-prefixed room to isolate broadcasts by tenant.
    // E.g., when a new conversation is created in the API, we can safely `io.to('org:{orgId}').emit(...)`
    socket.join(`org:${claims.org_id}`);
    wsActiveConnections.inc();

    socket.on('disconnect', () => {
      wsActiveConnections.dec();
    });

// MULTI-TENANCY CHECK: Client joins a conversation room (only if it belongs to their org).
    // This allows specific `assistant:delta` text streaming without leaking info across tabs or users.
    socket.on('conversation:join', async (conversationId: string) => {
      const conv = await prisma.conversation.findFirst({
        where: { id: conversationId, orgId: claims.org_id },
        select: { id: true },
      });
      if (!conv) return socket.emit('error:forbidden', { conversationId });
      // Prefix with "conv:" to avoid collision with organization rooms.
      socket.join(`conv:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Client sends a message and expects a streamed assistant reply.
    socket.on(
      'message:send',
      async (payload: { conversationId: string; content: string; promptId?: string }) => {
        const { conversationId, content } = payload || ({} as any);
        if (!conversationId || !content || typeof content !== 'string') {
          socket.emit('message:error', { error: 'invalid_payload' });
          return;
        }

        const conv = await prisma.conversation.findFirst({
          where: { id: conversationId, orgId: claims.org_id },
        });
        if (!conv) {
          socket.emit('message:error', { error: 'not_found' });
          return;
        }

        // Save user message.
        const userMsg = await prisma.message.create({
          data: {
            conversationId: conv.id,
            orgId: claims.org_id,
            role: MessageRole.USER,
            content,
          },
        });
        io!.to(`conv:${conv.id}`).emit('message:new', userMsg);

        // Resolve prompt (requested or default).
        const prompt = payload.promptId
          ? await prisma.prompt.findFirst({ where: { id: payload.promptId, orgId: claims.org_id } })
          : await prisma.prompt.findFirst({ where: { orgId: claims.org_id, isDefault: true } });

        // Build message history for the model.
        const history = await prisma.message.findMany({
          where: { conversationId: conv.id, orgId: claims.org_id },
          orderBy: { createdAt: 'asc' },
          take: 40,
        });
        const turns: ChatTurn[] = [];
        if (prompt) turns.push({ role: 'system', content: prompt.content });
        for (const m of history) {
          turns.push({
            role: m.role === MessageRole.ASSISTANT ? 'assistant' : m.role === MessageRole.SYSTEM ? 'system' : 'user',
            content: m.content,
          });
        }

        const streamId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        io!.to(`conv:${conv.id}`).emit('assistant:start', { streamId, conversationId: conv.id });

        let full = '';
        const startedAt = Date.now();
        try {
          for await (const delta of streamChat(turns)) {
            full += delta;
            io!.to(`conv:${conv.id}`).emit('assistant:delta', { streamId, delta });
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'unknown_error';
          io!.to(`conv:${conv.id}`).emit('assistant:error', { streamId, error: errMsg });
          return;
        }

        const saved = await prisma.message.create({
          data: {
            conversationId: conv.id,
            orgId: claims.org_id,
            role: MessageRole.ASSISTANT,
            content: full,
            promptId: prompt?.id,
            latencyMs: Date.now() - startedAt,
          },
        });
        io!.to(`conv:${conv.id}`).emit('assistant:done', { streamId, message: saved });
      },
    );
  });

  return io;
}
