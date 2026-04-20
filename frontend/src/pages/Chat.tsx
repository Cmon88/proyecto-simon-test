import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, Star, X as CloseIcon } from 'lucide-react';
import { api, ConversationDetail, Message, Prompt } from '@/lib/api';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket';

export default function Chat() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get<ConversationDetail>(`/api/conversations/${id}`),
    enabled: Boolean(id),
  });

  const { data: prompts } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.get<Prompt[]>('/api/prompts'),
  });

  const defaultPrompt = useMemo(() => prompts?.find((p) => p.isDefault), [prompts]);

  useEffect(() => {
    if (!selectedPromptId && defaultPrompt) setSelectedPromptId(defaultPrompt.id);
  }, [defaultPrompt, selectedPromptId]);

  // WebSocket lifecycle for this conversation.
  useEffect(() => {
    if (!id) return;
    const s = getSocket();
    s.emit('conversation:join', id);

    const onNew = (msg: Message) => {
      if (msg.conversationId !== id) return;
      qc.setQueryData<ConversationDetail>(['conversation', id], (prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
    };
    const onDelta = ({ delta }: { streamId: string; delta: string }) => {
      setStreamingText((prev) => prev + delta);
    };
    const onStart = () => {
      setStreaming(true);
      setStreamingText('');
    };
    const onDone = ({ message }: { message: Message }) => {
      setStreaming(false);
      setStreamingText('');
      qc.setQueryData<ConversationDetail>(['conversation', id], (prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === message.id)) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
    };
    const onErr = ({ error }: { error: string }) => {
      setStreaming(false);
      setStreamingText('');
      toast.error(`Error IA: ${error}`);
    };

    s.on('message:new', onNew);
    s.on('assistant:start', onStart);
    s.on('assistant:delta', onDelta);
    s.on('assistant:done', onDone);
    s.on('assistant:error', onErr);

    return () => {
      s.emit('conversation:leave', id);
      s.off('message:new', onNew);
      s.off('assistant:start', onStart);
      s.off('assistant:delta', onDelta);
      s.off('assistant:done', onDone);
      s.off('assistant:error', onErr);
    };
  }, [id, qc]);

  // Auto-scroll on updates.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [conv?.messages.length, streamingText]);

  const rate = useMutation({
    mutationFn: (rating: number) => api.post(`/api/conversations/${id}/rate`, { rating }),
    onSuccess: () => {
      toast.success('Calificación guardada');
      qc.invalidateQueries({ queryKey: ['conversation', id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const close = useMutation({
    mutationFn: () => api.post(`/api/conversations/${id}/close`),
    onSuccess: () => {
      toast.success('Conversación cerrada');
      qc.invalidateQueries({ queryKey: ['conversation', id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const send = (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || streaming) return;
    getSocket().emit('message:send', { conversationId: id, content, promptId: selectedPromptId });
    setDraft('');
  };

  if (!conv) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/conversaciones')} className="btn-ghost">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {conv.title || `Conversación ${conv.id.slice(0, 8)}`}
            </h1>
            <p className="text-xs text-slate-500">
              Canal <strong>{conv.channel}</strong> · iniciada {formatDate(conv.startedAt)} ·{' '}
              {conv.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RatingStars value={conv.rating} onChange={(r) => rate.mutate(r)} />
          {conv.status === 'OPEN' && (
            <button onClick={() => close.mutate()} className="btn-secondary">
              <CloseIcon size={14} /> Cerrar
            </button>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 card overflow-y-auto p-5 space-y-3">
        {conv.messages.length === 0 && !streaming && (
          <div className="h-full grid place-items-center text-slate-400 text-sm">
            Envía el primer mensaje para comenzar.
          </div>
        )}
        {conv.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming && (
          <MessageBubble
            message={{
              id: '__streaming__',
              conversationId: id,
              role: 'ASSISTANT',
              content: streamingText,
              createdAt: new Date().toISOString(),
              promptId: null,
              latencyMs: null,
            }}
            streaming
          />
        )}
      </div>

      <form onSubmit={send} className="mt-4 card p-3 flex gap-2 items-center">
        <select
          className="input max-w-[180px]"
          value={selectedPromptId ?? ''}
          onChange={(e) => setSelectedPromptId(e.target.value || undefined)}
          title="Personalidad (prompt)"
        >
          {prompts?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}</option>
          ))}
        </select>
        <input
          className="input flex-1"
          placeholder="Escribe un mensaje..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={streaming || conv.status === 'CLOSED'}
        />
        <button type="submit" className="btn-primary" disabled={streaming || conv.status === 'CLOSED' || !draft.trim()}>
          <Send size={16} /> Enviar a IA
        </button>
      </form>
      {conv.status === 'CLOSED' && (
        <p className="text-xs text-slate-400 mt-2">La conversación está cerrada. Reábrela desde la API para continuar.</p>
      )}
    </div>
  );
}

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === 'USER';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
        isUser
          ? 'bg-brand-600 text-white rounded-br-sm'
          : 'bg-slate-100 text-slate-800 rounded-bl-sm',
      )}>
        <span className={streaming ? 'stream-cursor' : ''}>{message.content}</span>
        <div className={cn('text-[10px] mt-1 opacity-70', isUser ? 'text-brand-100' : 'text-slate-500')}>
          {formatTime(message.createdAt)}
          {message.latencyMs != null && ` · ${(message.latencyMs / 1000).toFixed(2)}s`}
        </div>
      </div>
    </div>
  );
}

function RatingStars({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="p-1 rounded hover:bg-slate-100"
          title={`Calificar con ${n}`}
        >
          <Star
            size={18}
            className={cn(
              'transition',
              value && n <= value
                ? 'fill-amber-400 stroke-amber-500'
                : 'stroke-slate-300',
            )}
          />
        </button>
      ))}
    </div>
  );
}
