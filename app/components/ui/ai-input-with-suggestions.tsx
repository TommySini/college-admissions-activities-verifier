"use client";

import { LucideIcon } from "lucide-react";
import {
    Text,
    CheckCheck,
    ArrowDownWideNarrow,
    CornerRightDown,
} from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/app/components/hooks/use-auto-resize-textarea";

interface ActionItem {
    text: string;
    icon: LucideIcon;
    colors: {
        icon: string;
        border: string;
        bg: string;
    };
}

interface AIInputWithSuggestionsProps {
    id?: string;
    placeholder?: string;
    minHeight?: number;
    maxHeight?: number;
    actions?: ActionItem[];
    defaultSelected?: string;
    onSubmit?: (text: string, action?: string) => void;
    className?: string;
    disabled?: boolean;
}

const DEFAULT_ACTIONS: ActionItem[] = [
    {
        text: "Summary",
        icon: Text,
        colors: {
            icon: "text-orange-600",
            border: "border-orange-500",
            bg: "bg-orange-100",
        },
    },
    {
        text: "Fix Spelling and Grammar",
        icon: CheckCheck,
        colors: {
            icon: "text-emerald-600",
            border: "border-emerald-500",
            bg: "bg-emerald-100",
        },
    },
    {
        text: "Make shorter",
        icon: ArrowDownWideNarrow,
        colors: {
            icon: "text-purple-600",
            border: "border-purple-500",
            bg: "bg-purple-100",
        },
    },
];

export function AIInputWithSuggestions({
    id = "ai-input-with-actions",
    placeholder = "Enter your text here...",
    minHeight = 64,
    maxHeight = 200,
    actions = DEFAULT_ACTIONS,
    defaultSelected,
    onSubmit,
    className,
    disabled = false,
}: AIInputWithSuggestionsProps) {
    const [inputValue, setInputValue] = useState("");
    const [selectedItem, setSelectedItem] = useState<string | null>(defaultSelected ?? null);

    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight,
        maxHeight,
    });

    const toggleItem = (itemText: string) => {
        setSelectedItem((prev) => (prev === itemText ? null : itemText));
    };

    const currentItem = selectedItem
        ? actions.find((item) => item.text === selectedItem)
        : null;

    const handleSubmit = () => {
        if (inputValue.trim() && !disabled) {
            onSubmit?.(inputValue, selectedItem ?? undefined);
            setInputValue("");
            setSelectedItem(null);
            adjustHeight(true);
        }
    };

    return (
        <div className={cn("w-full py-2", className)}>
            <div className="relative w-full">
                <div className="relative border border-gray-700 focus-within:border-blue-500 rounded-xl bg-gray-900 shadow-sm">
                    <div className="flex flex-col">
                        <div
                            className="overflow-y-auto"
                            style={{ maxHeight: `${maxHeight - 48}px` }}
                        >
                            <Textarea
                                ref={textareaRef}
                                id={id}
                                placeholder={placeholder}
                                disabled={disabled}
                                className={cn(
                                    "w-full rounded-xl pr-10 pt-2 pb-2 px-3 placeholder:text-gray-500 border-none text-gray-100 resize-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed text-sm",
                                    `min-h-[${minHeight}px]`
                                )}
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        <div className="h-12 bg-transparent">
                            {currentItem && (
                                <div className="absolute left-3 bottom-3 z-10">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={disabled}
                                        className={cn(
                                            "inline-flex items-center gap-1.5",
                                            "border shadow-sm rounded-md px-2 py-0.5 text-xs font-medium",
                                            "animate-fadeIn hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200",
                                            currentItem.colors.bg,
                                            currentItem.colors.border,
                                            disabled && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <currentItem.icon
                                            className={`w-3.5 h-3.5 ${currentItem.colors.icon}`}
                                        />
                                        <span
                                            className={currentItem.colors.icon}
                                        >
                                            {selectedItem}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={disabled || !inputValue.trim()}
                        className={cn(
                            "absolute right-2 top-2 p-1.5 rounded-md transition-all duration-200",
                            inputValue.trim() && !disabled
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        <CornerRightDown className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center px-2">
                {actions.filter((item) => item.text !== selectedItem).map(
                    ({ text, icon: Icon, colors }) => (
                        <button
                            type="button"
                            key={text}
                            disabled={disabled}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-lg",
                                "border transition-all duration-200",
                                "border-gray-700 bg-gray-800 hover:bg-gray-700",
                                "flex-shrink-0 shadow-sm",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => toggleItem(text)}
                        >
                            <div className="flex items-center gap-1.5">
                                <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
                                <span className="text-gray-300 whitespace-nowrap">
                                    {text}
                                </span>
                            </div>
                        </button>
                    )
                )}
            </div>
        </div>
    );
}
