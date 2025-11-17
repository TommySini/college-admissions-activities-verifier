"use client";
import { useMemo } from "react";
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
import { Bell, Eye } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";

const BellIcon: FC<{ className?: string }> = ({ className }) => (
    <Bell className={className} strokeWidth={1.8} size={18} />
);

const EyeIcon: FC<{ className?: string }> = ({ className }) => (
    <Eye className={className} strokeWidth={1.8} size={18} />
);

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    const isStudent = session?.user?.role === "student";
    const isAdmin = session?.user?.role === "admin";

    const navItems = useMemo<(NavItemType & { icon: FC<{ className?: string }> })[]>(() => {
        if (isAdmin) {
            return [
                {
                    label: "Dashboard",
                    href: "/admin",
                    icon: BarChartSquare02,
                },
                {
                    label: "Insights",
                    href: "/admin#insights",
                    icon: BookOpen01,
                },
                {
                    label: "My Organizations",
                    href: "/admin#organizations",
                    icon: Building07,
                },
                {
                    label: "Notifications",
                    href: "/admin#notifications",
                    icon: BellIcon,
                },
                {
                    label: "View",
                    href: "/admin#view",
                    icon: EyeIcon,
                },
                {
                    label: "Settings",
                    href: "/admin#settings",
                    icon: Settings01,
                },
            ];
        }

        const items: (NavItemType & { icon: FC<{ className?: string }> })[] = [
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

        if (isStudent) {
            items.push(
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

        return items;
    }, [isAdmin, isStudent]);

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

