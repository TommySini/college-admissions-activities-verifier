'use client';

import { useState, useRef, useEffect } from 'react';
import { AIInputWithSuggestions } from '@/app/components/ui/ai-input-with-suggestions';
import { Text, CheckCheck, ArrowDownWideNarrow, Loader2 } from 'lucide-react';

const CUSTOM_ACTIONS = [
  {
    text: 'Summarize',
    icon: Text,
    colors: {
      icon: 'text-blue-600',
      border: 'border-blue-500',
      bg: 'bg-blue-100',
    },
  },
  {
    text: 'Proofread',
    icon: CheckCheck,
    colors: {
      icon: 'text-green-600',
      border: 'border-green-500',
      bg: 'bg-green-100',
    },
  },
  {
    text: 'Condense',
    icon: ArrowDownWideNarrow,
    colors: {
      icon: 'text-purple-600',
      border: 'border-purple-500',
      bg: 'bg-purple-100',
    },
  },
];

const STARTER_PROMPTS = [
  "What's my best activity?",
  'How many volunteering hours do I have?',
  'What should I aim for to get into a good college?',
  'Summarize my extracurricular profile',
  'Find alumni who mention robotics or engineering',
  'Show me clubs related to community service',
  'Search for alumni essays about leadership',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onClose?: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (text: string, action?: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show the actual error from the server
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error querying assistant:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${error.message || 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarterPrompt = (prompt: string) => {
    handleSubmit(prompt, 'Summarize');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Actify Assistant</h3>
            <p className="text-xs text-gray-400">Your personal college admissions guide</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mb-4">
              A
            </div>
            <h4 className="font-semibold text-white mb-2">Welcome to Actify Assistant!</h4>
            <p className="text-sm text-gray-400 mb-4">
              Ask me anything about your activities, volunteering hours, or college admissions
              guidance.
            </p>
            <div className="w-full space-y-2">
              <p className="text-xs text-gray-500 font-medium mb-2">Try asking:</p>
              {STARTER_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleStarterPrompt(prompt)}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg px-4 py-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 bg-gray-800">
        <AIInputWithSuggestions
          actions={CUSTOM_ACTIONS}
          placeholder="Ask me anything about your activities..."
          onSubmit={handleSubmit}
          disabled={isLoading}
          className="py-0"
          minHeight={48}
          maxHeight={150}
        />
      </div>
    </div>
  );
}
