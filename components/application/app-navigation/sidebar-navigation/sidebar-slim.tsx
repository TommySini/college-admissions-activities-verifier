"use client";

import type { FC } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { NavItemType } from "../config";
import { cx } from "@/utils/cx";
import { useDarkMode } from "@/app/context/DarkModeContext";
import { AssistantSidebarDock } from "@/app/components/assistant/AssistantSidebarDock";

interface SidebarNavigationSlimProps {
    items: (NavItemType & { icon?: FC<{ className?: string }> })[];
    footerItems?: (NavItemType & { icon?: FC<{ className?: string }> })[];
    className?: string;
    showAssistantDock?: boolean;
}

export const SidebarNavigationSlim = ({
    items,
    footerItems,
    className,
    showAssistantDock,
}: SidebarNavigationSlimProps) => {
    const pathname = usePathname();
    const { darkMode } = useDarkMode();

    const renderNavItem = (item: NavItemType & { icon?: FC<{ className?: string }> }) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || 
                        (item.items && item.items.some(subItem => pathname === subItem.href));
        
        if (!Icon || !item.href) return null;

        return (
            <Link
                key={item.label}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={cx(
                    "relative flex h-10 w-full items-center rounded-lg px-3 gap-3 justify-start transition-colors font-medium",
                    darkMode
                        ? isActive
                            ? "bg-slate-800 text-white"
                            : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        : isActive
                            ? "bg-gray-200 text-slate-900"
                            : "text-slate-700 hover:bg-gray-100 hover:text-slate-900"
                )}
            >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                    className="whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                    aria-hidden
                >
                    {item.label}
                </span>
                {item.badge && (
                    <span className={cx(
                        "ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
                        darkMode ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                    )}>
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    let assistantInjected = false;

    return (
        <aside
            className={cx(
                "group flex h-screen w-16 hover:w-48 transition-[width] duration-300 ease-out flex-col items-start border-r py-4 overflow-hidden rounded-r-3xl shadow-sm",
                darkMode
                    ? "border-zinc-800 bg-zinc-950"
                    : "border-gray-200 bg-white",
                className
            )}
        >
            {/* Logo */}
            <div className="mb-6 flex h-10 w-full items-center px-3 gap-3">
                <div className={cx(
                    "flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden shadow-sm shrink-0 border",
                    darkMode ? "border-zinc-800 bg-zinc-900" : "border-slate-200 bg-white"
                )}>
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                    >
                        <source src="/logo-video.mp4" type="video/mp4" />
                        {/* Fallback content if video cannot load */}
                        A
                    </video>
                </div>
                <span className={cx(
                    "text-base font-bold opacity-0 -translate-x-2 whitespace-nowrap group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200",
                    darkMode ? "text-zinc-100" : "text-slate-900"
                )}>
                    Actify
                </span>
            </div>

            {/* Main Navigation */}
            <nav className="flex flex-1 flex-col gap-2 w-full px-2">
                {items.map(item => {
                    const renderedItems: React.ReactNode[] = [];

                    if (showAssistantDock && !assistantInjected && item.label === "Settings") {
                        assistantInjected = true;
                        renderedItems.push(
                            <div key="assistant-dock" className="w-full">
                                <AssistantSidebarDock />
                            </div>
                        );
                    }

                    const navItem = renderNavItem(item);
                    if (navItem) {
                        renderedItems.push(navItem);
                    }

                    return renderedItems;
                })}

                {showAssistantDock && !assistantInjected && (
                    <div className="w-full">
                        <AssistantSidebarDock />
                    </div>
                )}
            </nav>

            <div className="mt-auto flex w-full flex-col gap-3 px-2 pb-2">
                {footerItems && footerItems.length > 0 && (
                    <div className={cx(
                        "flex flex-col gap-2 border-t pt-4",
                        darkMode ? "border-zinc-800" : "border-gray-200"
                    )}>
                        {footerItems.map(item => renderNavItem(item))}
                    </div>
                )}
            </div>
        </aside>
    );
};

