"use client";

import type { FC, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";
import { cx } from "@/utils/cx";

interface SidebarNavigationDualTierProps {
    items: (NavItemType & { icon?: FC<{ className?: string }> })[];
    footerItems?: (NavItemType & { icon?: FC<{ className?: string }> })[];
    featureCard?: ReactNode;
    className?: string;
}

export const SidebarNavigationDualTier = ({
    items,
    footerItems,
    featureCard,
    className,
}: SidebarNavigationDualTierProps) => {
    const pathname = usePathname();

    return (
        <aside
            className={cx(
                "flex h-screen w-64 flex-col border-r border-border-secondary bg-background-primary text-black",
                className
            )}
        >
            {/* Logo/Header */}
            <div className="flex h-16 items-center gap-3 px-6 border-b border-border-secondary">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-xl">A</span>
                </div>
                <span className="text-xl font-bold text-black">Actify</span>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 overflow-y-auto">
                <NavList items={items} activeUrl={pathname} />
            </nav>

            {/* Feature Card */}
            {featureCard && <div className="px-4 py-4">{featureCard}</div>}

            {/* Footer Navigation */}
            {footerItems && footerItems.length > 0 && (
                <div className="border-t border-border-secondary">
                    <NavList items={footerItems} activeUrl={pathname} />
                </div>
            )}
        </aside>
    );
};

