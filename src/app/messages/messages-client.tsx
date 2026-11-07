'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Send,
  Trash2,
  Shield,
  Crown,
  ShieldCheck,
  User,
  ArrowLeft,
  CheckCheck,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import {
  getMessagesAction,
  sendMessageAction,
  deleteMessageAction,
  getOrCreateDirectConversationAction,
  getConversationsAction,
} from '@/app/actions/messages';

export interface ConversationItem {
  id: string;
  isGroup: boolean;
  title: string;
  avatarUrl: string | null;
  otherMemberId: string | null;
  unread: boolean;
  lastMessage: {
    text: string;
    senderName: string;
    time: string;
  } | null;
  updatedAt: string;
}

export interface MemberItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  roomNumber: string | null;
  isPrimaryAdmin: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isCurrentUser: boolean;
}

export interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  isPrimaryAdmin: boolean;
  isManager: boolean;
  isOwn: boolean;
  createdAt: string;
}

interface MessagesClientProps {
  initialGroupConvId: string;
  initialConversations: ConversationItem[];
  allMembers: MemberItem[];
  currentMemberId: string;
  canModerate: boolean;
}

export function MessagesClient({
  initialGroupConvId,
  initialConversations,
  allMembers,
  currentMemberId,
  canModerate,
}: MessagesClientProps) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string>(initialGroupConvId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Restore saved active conversation on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('messmate_active_conv');
      if (saved && (saved === initialGroupConvId || conversations.some((c) => c.id === saved))) {
        setActiveConvId(saved);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [initialGroupConvId, conversations]);

  // Persist active conversation on change
  const handleSelectConv = (convId: string) => {
    setActiveConvId(convId);
    try {
      localStorage.setItem('messmate_active_conv', convId);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Auto scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Fetch messages helper
  const fetchMessages = useCallback(
    async (convId: string, showSpinner = false) => {
      if (!convId) return;
      if (showSpinner) setIsLoadingMessages(true);
      try {
        const res = await getMessagesAction(convId);
        setMessages(res.messages);
        if (showSpinner) {
          setTimeout(() => scrollToBottom(false), 80);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (showSpinner) setIsLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  // Fetch messages whenever activeConvId changes
  useEffect(() => {
    if (!activeConvId) return;
    fetchMessages(activeConvId, true);
  }, [activeConvId, fetchMessages]);

  // Background auto-polling (every 3.5 seconds) so messages never vanish and update in real-time
  useEffect(() => {
    if (!activeConvId) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchMessages(activeConvId, false);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeConvId, fetchMessages]);

  // Periodic polling for conversations list (every 10 seconds)
  useEffect(() => {
    const convInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const res = await getConversationsAction();
          setConversations(res.conversations);
        } catch {
          // Ignore background fetch failure
        }
      }
    }, 10000);

    return () => clearInterval(convInterval);
  }, []);

  // Manual refresh button
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMessages(activeConvId, true);
      const res = await getConversationsAction();
      setConversations(res.conversations);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Send Message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeConvId) return;

    setInputText('');

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      content: text,
      senderId: currentMemberId,
      senderName: 'You',
      senderAvatar: null,
      isPrimaryAdmin: false,
      isManager: false,
      isOwn: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await sendMessageAction(activeConvId, text);
      if (!res.success) {
        // Remove failed message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(res.error || 'Failed to send message');
      } else {
        // Replace temp ID with real ID
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: res.messageId! } : m))
        );
        // Refresh conversations to update snippets
        const convData = await getConversationsAction();
        setConversations(convData.conversations);
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // Handle Delete Message with confirmation to prevent accidental mobile touches
  const handleDeleteMessage = (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message? (আপনি কি নিশ্চিত বার্তাটি মুছে ফেলতে চান?)')) {
      return;
    }
    startTransition(async () => {
      const res = await deleteMessageAction(messageId);
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });
  };

  // Switch or create direct chat with a member
  const handleSelectMember = (memberId: string) => {
    startTransition(async () => {
      const res = await getOrCreateDirectConversationAction(memberId);
      if (res.conversationId) {
        handleSelectConv(res.conversationId);
      }
    });
  };

  // Filter members by search
  const filteredMembers = allMembers.filter(
    (m) =>
      !m.isCurrentUser &&
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group direct conversations
  const directConversations = conversations.filter((c) => !c.isGroup);

  return (
    <div className="h-[calc(100vh-140px)] min-h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* LEFT PANE: Conversation & Member List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/60 dark:bg-slate-900/60 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header & Search */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t.messages?.title || 'Mess Community & Messages'}
            </h2>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh messages"
              className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.messages?.searchMembers || 'Search roommates...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* 1. Group Common Room (Always Top) */}
          <button
            onClick={() => handleSelectConv(initialGroupConvId)}
            className={`w-full p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
              activeConvId === initialGroupConvId
                ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-l-4 border-emerald-600'
                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {t.messages?.groupChat || 'Mess Community Common Room'}
                </p>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                  All
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Group chat for all mess roommates
              </p>
            </div>
          </button>

          {/* 2. Direct Conversations (if any exist) */}
          {directConversations.length > 0 && (
            <div className="px-3.5 py-1.5 bg-slate-100/50 dark:bg-slate-950/40 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent Chats
            </div>
          )}

          {directConversations.map((conv) => {
            const isSelected = activeConvId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv.id)}
                className={`w-full p-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {conv.avatarUrl ? (
                    <img src={conv.avatarUrl} alt={conv.title} className="w-full h-full object-cover" />
                  ) : (
                    conv.title.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {conv.title}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {new Date(conv.lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {conv.lastMessage ? conv.lastMessage.text : 'Direct chat'}
                  </p>
                </div>
              </button>
            );
          })}

          {/* 3. All Roommates Section */}
          <div className="px-3.5 py-2 bg-slate-100/50 dark:bg-slate-950/40 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t.messages?.directMessages || 'All Roommates'}
          </div>

          {filteredMembers.map((m) => {
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMember(m.id)}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    m.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {m.name}
                    </p>
                    {m.isPrimaryAdmin ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">Admin</span>
                    ) : m.isManager ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">Manager</span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {m.roomNumber ? `Room ${m.roomNumber}` : 'Tap to message'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: Chat Window */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Chat Header */}
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveConvId('')}
              className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              {activeConversation?.isGroup || activeConvId === initialGroupConvId ? (
                <Users className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                {activeConversation?.title || (activeConvId === initialGroupConvId ? 'Mess Community Common Room' : 'Direct Chat')}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t.messages?.activeNow || 'Active • All messages saved permanently'}
              </p>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40 dark:bg-slate-950/20">
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-6 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <p>{t.messages?.noMessages || 'No messages in this conversation yet. Say hello!'}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.isOwn || msg.senderId === currentMemberId;
              const canDelete = isOwn || canModerate;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 group ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 mb-0.5">
                      {msg.senderAvatar ? (
                        <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        msg.senderName.charAt(0)
                      )}
                    </div>
                  )}

                  <div className={`max-w-[75%] sm:max-w-[65%] space-y-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {msg.senderName}
                        </span>
                        {msg.isPrimaryAdmin ? (
                          <span className="text-[9px] text-amber-500 font-bold">Admin</span>
                        ) : msg.isManager ? (
                          <span className="text-[9px] text-emerald-600 font-bold">Manager</span>
                        ) : null}
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl text-xs relative ${
                        isOwn
                          ? 'bg-emerald-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>

                      <div
                        className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${
                          isOwn ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && <CheckCheck className="w-3 h-3 text-emerald-200" />}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title={t.messages?.deleteMessage || 'Delete Message'}
                            className="opacity-0 group-hover:opacity-100 ml-1 text-rose-400 hover:text-rose-500 transition-opacity cursor-pointer p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.messages?.typeMessage || 'Type your message...'}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isPending}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-xs transition-colors cursor-pointer"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
