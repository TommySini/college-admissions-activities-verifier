'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Plus,
  Loader2,
  MessageSquare,
  ArrowLeft,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function AssistantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  // Helper function to deduplicate messages by ID
  const deduplicateMessages = (msgs: Message[]): Message[] => {
    return Array.from(new Map(msgs.map((msg) => [msg.id, msg])).values());
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load conversations on mount
  useEffect(() => {
    if (status === 'authenticated') {
      loadConversations();
    }
  }, [status]);

  // Check for conversation ID in URL
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam && conversations.length > 0) {
      setSelectedConversationId(conversationParam);
    }
  }, [searchParams, conversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      setShowMobileSidebar(false);
    }
  }, [selectedConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await fetch('/api/assistant/conversations');
      if (!response.ok) throw new Error('Failed to load conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/assistant/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();

      // Deduplicate messages by ID (defensive programming)
      const uniqueMessages = deduplicateMessages(data.messages || []);

      setMessages(uniqueMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    try {
      const response = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: firstMessage.substring(0, 80) }),
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const { conversation } = await response.json();
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversationId(conversation.id);
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const handleSubmit = async (text: string, action?: string) => {
    if (!text.trim() || isSending) return;

    setIsSending(true);

    try {
      let conversationId = selectedConversationId;

      // Create new conversation if none selected
      if (!conversationId) {
        conversationId = await createNewConversation(text);
      }

      // Add user message optimistically
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send message
      const response = await fetch(`/api/assistant/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, action }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const { userMessage: savedUserMessage, assistantMessage } = await response.json();

      // Replace optimistic message with saved messages
      setMessages((prev) => {
        // Remove the optimistic user message
        const withoutOptimistic = prev.filter((m) => m.id !== userMessage.id);

        // Add new messages and deduplicate
        return deduplicateMessages([...withoutOptimistic, savedUserMessage, assistantMessage]);
      });

      // Reload conversations to update timestamps
      loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${error.message || 'Please try again.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setMessages([]);
    setShowMobileSidebar(false);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection when clicking delete

    if (
      !confirm('Are you sure you want to delete this conversation? This action cannot be undone.')
    ) {
      return;
    }

    try {
      setDeletingConversationId(conversationId);

      const response = await fetch(`/api/assistant/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      // Remove conversation from state
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      // If the deleted conversation was selected, clear it
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversationId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Conversation List */}
      <div
        className={cn(
          'w-full md:w-80 border-r border-slate-200 bg-white flex flex-col',
          'absolute md:relative z-20 h-full',
          showMobileSidebar ? 'block' : 'hidden md:block'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-slate-900">AI Assistant</h1>
            </div>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden p-1 hover:bg-slate-100 rounded"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
          </div>
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Start a new chat to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="relative group">
                  <button
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 pr-12 rounded-xl transition text-sm border',
                      selectedConversationId === conversation.id
                        ? 'bg-blue-50 border-blue-200 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50 border-transparent'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conversation.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    disabled={deletingConversationId === conversation.id}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2',
                      'p-1.5 rounded-lg transition-colors',
                      'opacity-0 group-hover:opacity-100',
                      'hover:bg-red-50 hover:text-red-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      deletingConversationId === conversation.id ? 'opacity-100' : ''
                    )}
                    title="Delete conversation"
                  >
                    {deletingConversationId === conversation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - Show when sidebar is hidden */}
        <div className="md:hidden p-4 border-b border-slate-200 bg-white">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <MessageSquare className="h-5 w-5" />
            Conversations
          </button>
        </div>

        {/* Chat Header */}
        {selectedConversationId && (
          <div className="hidden md:flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                {conversations.find((c) => c.id === selectedConversationId)?.title || 'Chat'}
              </h2>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          {!selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-sm">
                A
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Welcome to Actify Assistant
              </h2>
              <p className="text-slate-600 mb-6 max-w-md">
                Ask me anything about your activities, volunteering hours, college admissions
                guidance, or explore alumni insights.
              </p>
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm"
              >
                <Plus className="h-5 w-5" />
                Start New Conversation
              </button>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                    <div
                      className={cn(
                        'text-xs mt-1.5',
                        message.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                      )}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {selectedConversationId && (
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  placeholder="Ask me anything..."
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const text = e.currentTarget.value;
                      if (text.trim()) {
                        handleSubmit(text);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none min-h-[48px] max-h-[200px]"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                    if (textarea) {
                      const text = textarea.value;
                      if (text.trim() && !isSending) {
                        handleSubmit(text);
                        textarea.value = '';
                      }
                    }
                  }}
                  disabled={isSending}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state input */}
        {!selectedConversationId && (
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  placeholder="Start a new conversation..."
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const text = e.currentTarget.value;
                      if (text.trim()) {
                        handleSubmit(text);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none min-h-[48px] max-h-[200px]"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                    if (textarea) {
                      const text = textarea.value;
                      if (text.trim() && !isSending) {
                        handleSubmit(text);
                        textarea.value = '';
                      }
                    }
                  }}
                  disabled={isSending}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
