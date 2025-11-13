"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Rnd } from "react-rnd";
import { ChatPanel } from "./ChatPanel";
import { MessageSquare, X, Maximize2, Minimize2 } from "lucide-react";

export function AssistantWidget() {
  const { data: session, status } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 380, height: 560 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Initialize position on mount (bottom-right corner)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth - 400,
        y: window.innerHeight - 600,
      });
    }
  }, []);

  // Don't render if not authenticated
  if (status !== "authenticated" || !session) {
    return null;
  }

  // Collapsed pill button
  if (!isExpanded) {
    return (
      <Rnd
        position={position}
        onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
        enableResizing={false}
        bounds="window"
        style={{
          zIndex: 9999,
        }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-move"
          title="Open Actify Assistant"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium text-sm">Ask Assistant</span>
        </button>
      </Rnd>
    );
  }

  // Expanded panel
  return (
    <Rnd
      size={isMinimized ? { width: 320, height: 56 } : size}
      position={position}
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (!isMinimized) {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(position);
        }
      }}
      minWidth={320}
      minHeight={isMinimized ? 56 : 400}
      maxWidth={800}
      maxHeight={isMinimized ? 56 : 900}
      bounds="window"
      enableResizing={!isMinimized}
      dragHandleClassName="drag-handle"
      style={{
        zIndex: 9999,
      }}
      className="shadow-2xl rounded-lg overflow-hidden"
    >
      <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
        {isMinimized ? (
          // Minimized header bar
          <div className="drag-handle flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 cursor-move">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                A
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                Actify Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        ) : (
          // Full panel with chat
          <>
            {/* Drag handle bar */}
            <div className="drag-handle flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200 cursor-move">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            {/* Chat panel */}
            <div className="flex-1 overflow-hidden">
              <ChatPanel onClose={() => setIsExpanded(false)} />
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
}

