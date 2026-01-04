'use client';

import { useState } from 'react';
import { Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AssistantDashboardWidget({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (text: string, action?: string) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // If no conversation exists, create one
      if (!conversationId) {
        const createResponse = await fetch('/api/assistant/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.substring(0, 80) }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(
            errorData.error || `Failed to create conversation (${createResponse.status})`
          );
        }

        const { conversation } = await createResponse.json();
        setConversationId(conversation.id);

        // Send message to the new conversation
        const messageResponse = await fetch(
          `/api/assistant/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, action }),
          }
        );

        if (!messageResponse.ok) {
          throw new Error('Failed to send message');
        }

        const { answer } = await messageResponse.json();
        setResponse(answer);
      } else {
        // Send message to existing conversation
        const messageResponse = await fetch(
          `/api/assistant/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, action }),
          }
        );

        if (!messageResponse.ok) {
          throw new Error('Failed to send message');
        }

        const { answer } = await messageResponse.json();
        setResponse(answer);
      }
    } catch (error: any) {
      console.error('Error:', error);
      setResponse(`I'm sorry, I encountered an error: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAssistant = () => {
    if (conversationId) {
      router.push(`/assistant?conversation=${conversationId}`);
    } else {
      router.push('/assistant');
    }
  };

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="flex h-full flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Actify AI Assistant
            </p>
          </div>
          <button
            onClick={handleOpenAssistant}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
          >
            Open
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}

          {response && (
            <div className="flex-1 overflow-auto">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{response}</p>
              </div>
              {conversationId && (
                <button
                  onClick={handleOpenAssistant}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100"
                >
                  Continue in Assistant
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 pt-3">
          <div className="relative">
            <textarea
              placeholder="Ask me anything..."
              disabled={isLoading}
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none min-h-[44px] max-h-[120px]"
              rows={1}
            />
            <button
              type="button"
              onClick={(e) => {
                const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                if (textarea) {
                  const text = textarea.value;
                  if (text.trim() && !isLoading) {
                    handleSubmit(text);
                    textarea.value = '';
                  }
                }
              }}
              disabled={isLoading}
              className="absolute right-2 top-2 p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
