import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Ref } from 'react';
import BotAvatar from 'bot-avatars';
import { ArrowUp, BookOpen, Clock3, MessageCircle, Plus, X } from 'lucide-react';
import { sendAssistantMessage, type AssistantMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

interface ChatEntry extends AssistantMessage {
  id: number;
}

const STORAGE_KEY = 'scopegraph_assistant_history_v1';
const MAX_MESSAGE_LENGTH = 2000;

function ScoutAvatar({
  size,
  state = 'default',
  theme = 'light',
  color = '#C7F36B',
  ink,
  avatarRef,
}: {
  size: number;
  state?: 'default' | 'working';
  theme?: 'light' | 'dark';
  color?: string;
  ink?: string;
  avatarRef?: Ref<HTMLCanvasElement>;
}) {
  return (
    <BotAvatar
      type="clover"
      size={size}
      face="mouth"
      state={state}
      color={color}
      ink={ink}
      saturation={1.1}
      theme={theme}
      interactive
      turn={1}
      jumpEvery={8}
      ref={avatarRef}
    />
  );
}

const suggestions = [
  { icon: BookOpen, key: 'assistant.suggestion_impact' },
  { icon: Clock3, key: 'assistant.suggestion_mcp' },
] as const;

export const FloatingAssistant: React.FC = () => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const messageIdRef = useRef(0);
  const hasDraft = Boolean(draft.trim());
  const hasStartedConversation = messages.some((message) => message.role === 'user');
  const showQuickActionsControl = (!hasStartedConversation && !hasDraft) || isQuickActionsOpen;

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(stored)) {
        const entries = stored.filter(
          (entry): entry is ChatEntry =>
            typeof entry?.id === 'number' &&
            (entry.role === 'user' || entry.role === 'assistant') &&
            typeof entry.content === 'string'
        ).slice(-40);
        messageIdRef.current = entries.reduce((max, entry) => Math.max(max, entry.id), 0);
        setMessages(entries);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    try {
      if (messages.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Keep the widget usable when browser storage is disabled or full.
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const clearConversation = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsSending(false);
    setError('');
    setDraft('');
    setIsOptionsOpen(false);
    setIsQuickActionsOpen(false);
    setMessages([]);
  };

  const submitMessage = async (event?: FormEvent<HTMLFormElement>, suggestion?: string) => {
    event?.preventDefault();
    const question = (suggestion ?? draft).trim();
    if (!question || isSending) return;
    if (question.length > MAX_MESSAGE_LENGTH) {
      setError(t('assistant.too_long'));
      return;
    }

    const history = messages.slice(-12).map(({ role, content }) => ({ role, content }));
    const userEntry: ChatEntry = { id: ++messageIdRef.current, role: 'user', content: question };
    setMessages((current) => [...current, userEntry]);
    setDraft('');
    setError('');
    setIsQuickActionsOpen(false);
    setIsSending(true);
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await sendAssistantMessage(question, history, language, controller.signal);
      setMessages((current) => [...current, {
        id: ++messageIdRef.current,
        role: 'assistant',
        content: response.grounded ? response.answer : t('assistant.unsure'),
      }]);
    } catch {
      if (!controller.signal.aborted) setError(t('assistant.error'));
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsSending(false);
      }
    }
  };

  const closeChat = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsSending(false);
    setIsOptionsOpen(false);
    setIsQuickActionsOpen(false);
    setIsOpen(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] sm:bottom-7 sm:right-7">
      {isOpen && (
        <section
          aria-label={t('assistant.title')}
          className="assistant-panel pointer-events-auto relative mb-4 flex h-[min(540px,calc(100dvh-112px))] w-[min(368px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#E4E7E1] bg-white shadow-[0_20px_60px_rgba(21,25,35,0.18)]"
        >
          <header className="relative flex h-[76px] shrink-0 items-center justify-between bg-white px-3 sm:h-[92px] sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E6F8F2] sm:h-14 sm:w-14">
                <ScoutAvatar size={44} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-semibold leading-[1.6] text-[#151923]">{t('assistant.title')}</h2>
                <p className="truncate text-[12px] leading-4 text-[#8B929E] sm:text-[13px] sm:leading-5">{t('assistant.subtitle')}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-[#151923]">
              <button type="button" onClick={() => setIsOptionsOpen((open) => !open)} aria-label={t('assistant.options')} aria-expanded={isOptionsOpen}
                className="rounded-md p-1 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7F36B]">
                <img src="/images/chatbot/more.svg" alt="" width={24} height={24} />
              </button>
              <button type="button" onClick={closeChat} aria-label={t('assistant.close')}
                className="rounded-md p-1 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7F36B]">
                <img src="/images/chatbot/close.svg" alt="" width={24} height={24} />
              </button>
            </div>
            <img src="/images/chatbot/header-divider.svg" alt="" width={950} height={1} className="pointer-events-none absolute left-[-1px] top-[75px] z-10 max-w-none sm:top-[91px]" />
            {isOptionsOpen && (
              <div className="absolute right-[52px] top-[68px] z-20 min-w-40 rounded-lg border border-[#E4E7E1] bg-white p-1 shadow-lg">
                <button type="button" onClick={clearConversation}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-[#151923] transition hover:bg-[#F7F8F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7F36B]">
                  {t('assistant.clear')}
                </button>
              </div>
            )}
          </header>

          <div className="relative min-h-0 flex-1">
            <div ref={scrollRef} className="assistant-messages absolute inset-0 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(31,181,139,0.06),_transparent_62%)] px-3 py-3 sm:px-4 sm:py-3" aria-live="polite">
              <div className="flex items-end gap-2">
                <ScoutAvatar size={36} avatarRef={avatarRef} />
                <div className="assistant-message max-w-[84%] rounded-2xl rounded-bl-md border border-[#E3F0EA] bg-[#F3FAF7] px-4 py-3 text-sm leading-6 text-[#344054]">
                  <span className="mb-1 block text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-[#1FB58B] sm:text-[11px]">{t('assistant.welcome_heading')}</span>
                  {t('assistant.welcome')}
                </div>
              </div>
              <p className="ml-10 text-[10px] leading-4 text-[#8B929E]">{t('assistant.disclaimer')}</p>
              {messages.map((message, index) => {
                const latestAssistant = !isSending && message.role === 'assistant' && index === messages.length - 1;
                return (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'items-end gap-2.5'}`}>
                    {message.role === 'assistant' && (latestAssistant ? <ScoutAvatar size={36} avatarRef={avatarRef} /> : <div className="w-9 shrink-0" aria-hidden="true" />)}
                    <div className={`assistant-message max-w-[84%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-[#1FB58B] text-white'
                        : 'rounded-bl-md border border-[#E3F0EA] bg-[#F3FAF7] text-[#344054]'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                );
              })}
            {isSending && (
                <div className="flex items-end gap-2.5" role="status">
                  <ScoutAvatar size={40} state="working" />
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#E3F0EA] bg-[#F3FAF7] px-4 py-3">
                    <span className="assistant-typing-dot" />
                    <span className="assistant-typing-dot [animation-delay:120ms]" />
                    <span className="assistant-typing-dot [animation-delay:240ms]" />
                    <span className="sr-only">{t('assistant.typing')}</span>
                  </div>
                </div>
              )}
              {error && <p role="alert" className="ml-10 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            </div>
          </div>

          <footer className="shrink-0 bg-white px-3 pb-2 pt-2 sm:px-4 sm:pb-3 sm:pt-2">
            <div className={`flex items-center transition-[gap] duration-200 ${showQuickActionsControl ? 'gap-2 sm:gap-3' : 'gap-0'}`}>
              <div className={`relative h-8 shrink-0 overflow-visible transition-[width] duration-300 ease-out sm:h-10 ${showQuickActionsControl ? 'w-8 sm:w-10' : 'w-0'}`}>
                <button type="button" onClick={() => setIsQuickActionsOpen((open) => !open)} aria-label={t('assistant.quick_actions')} aria-expanded={isQuickActionsOpen}
                  aria-hidden={!showQuickActionsControl} tabIndex={showQuickActionsControl ? 0 : -1} disabled={!showQuickActionsControl}
                  className={`absolute bottom-0 left-0 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#D8E5DF] bg-white text-[#19B982] shadow-[0_4px_16px_rgba(21,25,35,0.08)] transition-all duration-200 hover:bg-[#F7FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D9CE] sm:h-10 sm:w-10 ${showQuickActionsControl ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'}`}>
                  {isQuickActionsOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} /> : <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />}
                </button>
                {suggestions.map(({ icon: Icon, key }, index) => {
                  const visible = isQuickActionsOpen && !isSending;
                  return (
                    <button key={key} type="button" onClick={() => void submitMessage(undefined, t(key))}
                      aria-hidden={!visible} tabIndex={visible ? 0 : -1} disabled={!visible || isSending}
                      style={{
                        transform: visible ? `translateY(-${56 * (index + 1)}px) scale(1)` : 'translateY(0) scale(0.92)',
                        transitionDelay: visible ? `${index * 70}ms` : '0ms',
                      }}
                      className={`absolute bottom-0 left-0 z-20 flex h-10 w-max max-w-[calc(100vw-80px)] origin-bottom-left items-center gap-2 rounded-full border border-[#DCE8E2] bg-white px-4 text-left text-sm font-medium text-[#344054] shadow-[0_8px_24px_rgba(21,25,35,0.12)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                      <Icon size={16} className="shrink-0 text-[#19B982]" />{t(key)}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={(event) => void submitMessage(event)} className="assistant-composer flex min-h-[48px] min-w-0 flex-1 items-center gap-1.5 rounded-xl p-1.5 transition-all duration-300 ease-out sm:min-h-[54px] sm:gap-2 sm:rounded-[14px] sm:p-2">
                <label className="sr-only" htmlFor="scopegraph-assistant-message">{t('assistant.placeholder')}</label>
                <textarea id="scopegraph-assistant-message" value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={1}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void submitMessage();
                    }
                  }} placeholder={t('assistant.placeholder')} disabled={isSending}
                  className="max-h-24 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-1 text-[12px] leading-4 text-[#151923] outline-none placeholder:text-[#98A3B7] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:px-2.5 sm:py-1 sm:text-sm sm:leading-5" />
                <button type="submit" disabled={!draft.trim() || isSending} aria-label={t('assistant.send')}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-all duration-200 active:scale-95 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D9CE] sm:h-9 sm:w-9 sm:rounded-[10px] ${hasDraft ? 'bg-[#1FB58B] hover:bg-[#159F78]' : 'bg-[#C9DAD3] hover:bg-[#B9CEC6]'}`}>
                  <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </form>
            </div>
            <p className="mt-2 text-center text-[9px] leading-3 text-[#98A3B7] sm:mt-2 sm:text-[10px] sm:leading-4">{t('assistant.footer_disclaimer')}</p>
          </footer>
        </section>
      )}

      <button type="button" onClick={() => isOpen ? closeChat() : setIsOpen(true)}
        aria-label={isOpen ? t('assistant.close') : t('assistant.open')} aria-expanded={isOpen}
        className={`assistant-launcher pointer-events-auto ml-auto flex h-[60px] w-[60px] items-center justify-center rounded-full border-4 border-white bg-[#1FB58B] text-white shadow-[0_8px_24px_rgba(31,181,139,0.35)] transition hover:scale-105 hover:bg-[#159F78] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2F4E9] ${isOpen ? 'rotate-90' : ''}`}>
        {isOpen ? <X className="h-[22px] w-[22px] text-white" aria-hidden="true" /> : (
          <span className="relative flex items-center justify-center">
            <ScoutAvatar size={48} theme="light" color="#FFFFFF" ink="#151923" />
            <MessageCircle className="absolute -bottom-1 -right-1 h-[19px] w-[19px] rounded-full border-2 border-white bg-[#1FB58B] p-0.5 text-white" />
          </span>
        )}
      </button>
    </div>
  );
};
