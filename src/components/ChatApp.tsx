import { List, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import {
  askHandbookStream,
  stepFromEvent,
  type LiveTurn,
} from "../lib/ask";
import {
  listConversations,
  listMessages,
  type ChatMessage,
  type Conversation,
} from "../lib/conversations";
import { errorMessage, initials } from "../lib/errors";
import { navigate } from "../lib/route";
import { HandbookViewProvider, useHandbookView } from "../lib/handbook-view";
import { AccountPanel } from "./AccountPanel";
import { BottomSheet } from "./BottomSheet";
import { Composer } from "./Composer";
import { HandbookPane } from "./HandbookPane";
import { MessageList } from "./MessageList";
import { ThreadList } from "./ThreadList";

export function ChatApp({ conversationId }: { conversationId?: string }) {
  return (
    <HandbookViewProvider>
      <ChatAppShell conversationId={conversationId} />
    </HandbookViewProvider>
  );
}

function ChatAppShell({ conversationId }: { conversationId?: string }) {
  const auth = useAuth();
  const handbook = useHandbookView();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const streamGen = useRef(0);

  const refreshThreads = useCallback(async () => {
    try {
      setConversations(await listConversations());
    } catch (error) {
      toast.error(errorMessage(error, "Could not load threads."));
    }
  }, []);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!conversationId) {
      if (!pending) setMessages([]);
      return;
    }
    if (pending) return;
    let active = true;
    void listMessages(conversationId)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch((error) => {
        if (active) {
          toast.error(errorMessage(error, "Could not load this thread."));
        }
      });
    return () => {
      active = false;
    };
  }, [conversationId, pending]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, live]);

  async function send(question: string) {
    const token = auth.session?.access_token;
    if (!token) {
      toast.error("Sign in to ask.");
      return;
    }
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: question,
      citations: [],
      created_at: new Date().toISOString(),
    };
    const gen = ++streamGen.current;
    let stepId = 0;
    let sawAnswer = false;
    setMessages((current) => [...current, optimistic]);
    setPending(true);
    setLive({
      startedAt: Date.now(),
      steps: [],
      answer: "",
      citations: [],
    });
    try {
      const result = await askHandbookStream(
        question,
        token,
        conversationId,
        (event) => {
          if (gen !== streamGen.current) return;
          if (event.type === "thread") {
            if (event.conversation_id !== conversationId) {
              navigate({ page: "chat", conversationId: event.conversation_id });
            }
            return;
          }
          if (event.type === "token") {
            sawAnswer = true;
            setLive((current) =>
              current
                ? { ...current, answer: current.answer + event.text }
                : current,
            );
            return;
          }
          const step = stepFromEvent(event, `s${++stepId}`);
          if (step) {
            setLive((current) =>
              current
                ? { ...current, steps: [...current.steps, step] }
                : current,
            );
          }
          if (event.type === "match") {
            setLive((current) =>
              current
                ? {
                    ...current,
                    citations: [
                      ...current.citations,
                      {
                        page: event.page,
                        excerpt: event.excerpt,
                        score: event.score,
                      },
                    ],
                  }
                : current,
            );
          }
        },
      );
      if (gen !== streamGen.current) return;
      setLive((current) =>
        current
          ? {
              ...current,
              endedAt: Date.now(),
              answer: result.answer,
              citations: result.citations,
            }
          : current,
      );
      if (result.conversation_id !== conversationId) {
        navigate({ page: "chat", conversationId: result.conversation_id });
      }
      const rows = await listMessages(result.conversation_id);
      if (gen !== streamGen.current) return;
      setMessages(rows);
      setLive(null);
      await refreshThreads();
    } catch (error) {
      if (gen !== streamGen.current) return;
      if (!sawAnswer) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimistic.id),
        );
        setLive(null);
      } else {
        setLive((current) =>
          current ? { ...current, endedAt: Date.now() } : current,
        );
      }
      toast.error(errorMessage(error, "Could not get an answer."));
    } finally {
      if (gen === streamGen.current) setPending(false);
    }
  }

  function startNew() {
    streamGen.current += 1;
    setHistoryOpen(false);
    setPending(false);
    setLive(null);
    setMessages([]);
    navigate({ page: "chat" });
  }

  function selectThread(id: string) {
    streamGen.current += 1;
    setPending(false);
    setLive(null);
    setHistoryOpen(false);
    navigate({ page: "chat", conversationId: id });
  }

  const rail = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-1 pb-4">
        <div>
          <p className="text-label-sm tracking-[0.14em] text-on-surface-variant uppercase">
            Threads
          </p>
          <h1 className="text-title-md tracking-tight">Am I fucked?</h1>
        </div>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-full bg-primary px-3 text-label-sm tracking-wide text-on-primary"
          onClick={startNew}
        >
          <Plus size={16} strokeWidth={1.75} aria-hidden />
          New
        </button>
      </div>
      <div className="sheet-scroll min-h-0 flex-1 pr-1">
        <ThreadList
          conversations={conversations}
          selectedId={conversationId}
          onSelect={selectThread}
        />
      </div>
      <div className="pt-4">
        <AccountPanel />
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh bg-surface-dim text-on-surface">
      <aside
        className={`hidden w-80 shrink-0 flex-col border-r border-outline-variant/50 bg-surface px-4 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-4 ${
          handbook.page == null ? "md:flex" : "xl:flex"
        }`}
      >
        {rail}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-container-padding-mobile pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 md:hidden">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
            aria-label="Open threads"
            onClick={() => setHistoryOpen(true)}
          >
            <List size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm tracking-[0.14em] text-on-surface-variant uppercase">
              Handbook
            </p>
            <h1 className="truncate text-title-md tracking-tight">
              {conversations.find((item) => item.id === conversationId)?.title ??
                "Am I fucked?"}
            </h1>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
            aria-label="New chat"
            onClick={startNew}
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-secondary-container text-[12px] font-semibold text-on-secondary-container"
            aria-label="Account"
            onClick={() => setAccountOpen(true)}
          >
            {auth.displayName ? initials(auth.displayName) : "?"}
          </button>
        </header>

        <div
          ref={scroller}
          className="sheet-scroll min-h-0 flex-1 px-container-padding-mobile md:px-8"
        >
          <MessageList
            messages={messages}
            live={live}
            onSuggest={(question) => void send(question)}
          />
        </div>

        <div className="px-container-padding-mobile pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-6">
          <Composer disabled={pending} onSend={(question) => void send(question)} />
        </div>
      </section>

      <HandbookPane />

      {historyOpen ? (
        <BottomSheet
          title="Threads"
          overlayLabel="Close threads"
          onClose={() => setHistoryOpen(false)}
        >
          <div className="mb-4">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-label-sm tracking-wide text-on-primary"
              onClick={startNew}
            >
              <Plus size={16} strokeWidth={1.75} aria-hidden />
              New chat
            </button>
          </div>
          <ThreadList
            conversations={conversations}
            selectedId={conversationId}
            onSelect={selectThread}
          />
        </BottomSheet>
      ) : null}

      {accountOpen ? (
        <BottomSheet
          title="Account"
          overlayLabel="Close account"
          onClose={() => setAccountOpen(false)}
        >
          <AccountPanel />
        </BottomSheet>
      ) : null}
    </div>
  );
}
