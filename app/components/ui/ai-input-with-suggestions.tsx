"use client";

import { useState, useRef, useEffect } from "react";
import { LucideIcon } from "lucide-react";

interface ActionConfig {
  text: string;
  icon: LucideIcon;
  colors: {
    icon: string;
    border: string;
    bg: string;
  };
}

interface AIInputWithSuggestionsProps {
  actions: ActionConfig[];
  defaultSelected?: string;
  placeholder?: string;
  onSubmit?: (text: string, action: string) => void;
  disabled?: boolean;
}

export function AIInputWithSuggestions({
  actions,
  defaultSelected,
  placeholder = "Enter text...",
  onSubmit,
  disabled = false,
}: AIInputWithSuggestionsProps) {
  const [selectedAction, setSelectedAction] = useState<string>(
    defaultSelected || actions[0]?.text || ""
  );
  const [inputValue, setInputValue] = useState("");
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentAction = actions.find((a) => a.text === selectedAction) || actions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (inputValue.trim() && onSubmit) {
      onSubmit(inputValue, selectedAction);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Action Selector Dropdown */}
      {showActions && (
        <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 min-w-[200px]">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.text}
                onClick={() => {
                  setSelectedAction(action.text);
                  setShowActions(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  selectedAction === action.text ? "bg-gray-100" : ""
                }`}
              >
                <div
                  className={`p-1.5 rounded-md border ${action.colors.border} ${action.colors.bg}`}
                >
                  <Icon className={`w-4 h-4 ${action.colors.icon}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Container */}
      <div className="relative flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        {/* Selected Action Button */}
        <button
          onClick={() => setShowActions(!showActions)}
          disabled={disabled}
          className={`flex-shrink-0 p-2 rounded-md border ${currentAction.colors.border} ${currentAction.colors.bg} hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
          title={currentAction.text}
        >
          <currentAction.icon className={`w-5 h-5 ${currentAction.colors.icon}`} />
        </button>

        {/* Text Input */}
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent min-h-[24px] max-h-[120px] disabled:cursor-not-allowed"
          rows={1}
          style={{
            height: "auto",
            overflowY: inputValue.split("\n").length > 3 ? "auto" : "hidden",
          }}
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !inputValue.trim()}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

