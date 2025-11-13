"use client";

import type { FC } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { NavItemType } from "../config";
import { cx } from "@/utils/cx";

interface SidebarNavigationSlimProps {
    items: (NavItemType & { icon?: FC<{ className?: string }> })[];
    footerItems?: (NavItemType & { icon?: FC<{ className?: string }> })[];
    className?: string;
}

export const SidebarNavigationSlim = ({
    items,
    footerItems,
    className,
}: SidebarNavigationSlimProps) => {
    const pathname = usePathname();

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
                    "relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                    isActive 
                        ? "bg-gray-200 text-black" 
                        : "text-black hover:bg-gray-100"
                )}
            >
                <Icon className="h-6 w-6" />
                {item.badge && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <aside
            className={cx(
                "flex h-screen w-16 flex-col items-center border-r border-gray-200 bg-white py-4",
                className
            )}
        >
            {/* Logo */}
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden shadow-sm">
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

            {/* Main Navigation */}
            <nav className="flex flex-1 flex-col gap-2">
                {items.map(item => renderNavItem(item))}
            </nav>

            {/* Footer Navigation */}
            {footerItems && footerItems.length > 0 && (
                <div className="mt-auto flex flex-col gap-2 border-t border-gray-200 pt-4">
                    {footerItems.map(item => renderNavItem(item))}
                </div>
            )}
        </aside>
    );
};

