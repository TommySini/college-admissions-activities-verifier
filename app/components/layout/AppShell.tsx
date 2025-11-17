"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import type { NavItemType } from "@/components/application/app-navigation/config";
import type { FC } from "react";
import {
    Users01,
    Building07,
    HeartHand,
    GraduationHat01,
    User01,
    Settings01,
    BarChartSquare02,
    BookOpen01,
} from "@untitledui/icons";
import { WebGLShader } from "@/components/ui/web-gl-shader";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Hide shell on auth, API routes, and homepage when not authenticated
    const hideShell = pathname.startsWith("/auth") || pathname.startsWith("/api") || (pathname === "/" && !session);
    if (hideShell) return <>{children}</>;

    const isStudent = session?.user?.role === "student";
    const isAdmin = session?.user?.role === "admin";

    // Main navigation items
    const navItems: (NavItemType & { icon: FC<{ className?: string }> })[] = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: BarChartSquare02,
        },
        {
            label: "Activities",
            href: "/activities",
            icon: BookOpen01,
        },
    ];

    // Add student-specific items
    if (isStudent) {
        navItems.push(
            {
                label: "Clubs",
                href: "/clubs",
                icon: Users01,
            },
            {
                label: "Organizations",
                href: "/organizations",
                icon: Building07,
            },
            {
                label: "Volunteering",
                href: "/volunteering",
                icon: HeartHand,
            },
            {
                label: "Alumni Database",
                href: "/alumni",
                icon: GraduationHat01,
            }
        );
    }

    // Add admin-specific items
    if (isAdmin) {
        navItems.push({
            label: "Admin",
            href: "/admin",
            icon: Settings01,
        });
    }

    // Footer items
    const footerItems: (NavItemType & { icon: FC<{ className?: string }> })[] = [
        {
            label: "Profile",
            href: "/profile",
            icon: User01,
        },
    ];

    return (
        <div className="relative min-h-screen flex overflow-hidden">
            {/* WebGL Background */}
            <WebGLShader />
            
            {/* Content Layer */}
            <div className="relative z-10 flex w-full">
                <SidebarNavigationSlim
                    items={navItems}
                    footerItems={footerItems}
                />
                <main className="flex-1 min-w-0 overflow-auto">{children}</main>
            </div>
        </div>
    );
}

