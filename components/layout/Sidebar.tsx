"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  navSections,
  dashboardItem,
  settingsItem,
  type NavGroup,
} from "@/lib/navConfig";

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { can, role } = useRole();

  // Keep groups open if current path is inside them
  const defaultOpen = (group: NavGroup) =>
    group.children.some((c) => pathname.startsWith(c.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    navSections.forEach((section) => {
      section.groups.forEach((g) => {
        state[g.label] = defaultOpen(g);
      });
    });
    return state;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isItemActive = (href: string) =>
    pathname === href || (pathname.startsWith(href + "/") && href !== "/dashboard");

  return (
    <div className="hidden lg:flex w-[280px] flex-col bg-white border-r border-gray-100 h-screen fixed top-0 left-0 m-3 rounded-3xl shadow-sm z-40 overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
              <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight block leading-none">Scath</span>
            <span className="text-[10px] font-medium text-blue/70 uppercase tracking-widest">Admin Portal</span>
          </div>
        </div>
      </div>

      <div className="mx-6 h-px bg-gray-100 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">

        {/* Dashboard — top standalone */}
        <Link
          href={dashboardItem.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            pathname === dashboardItem.href
              ? "bg-blue text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <dashboardItem.icon
            className={cn(
              "w-4 h-4 shrink-0",
              pathname === dashboardItem.href ? "text-white" : "text-gray-400",
            )}
          />
          {dashboardItem.label}
        </Link>

        {/* Sections */}
        {navSections.map((section) => {
          // Filter groups by role
          const visibleGroups = section.groups.filter(
            (g) => !g.roles || can(g.roles),
          );
          if (visibleGroups.length === 0) return null;

          return (
            <div key={section.sectionLabel} className="pt-3">
              {/* Section label */}
              {section.sectionLabel && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                  {section.sectionLabel}
                </p>
              )}

              {/* Groups */}
              <div className="space-y-0.5">
                {visibleGroups.map((group) => {
                  const isGroupActive = group.children.some((c) => isItemActive(c.href));
                  const isOpen = openGroups[group.label];

                  // If only one child and its label matches group, render as flat item
                  const isSingleDirect =
                    group.children.length === 1 &&
                    group.children[0].label.toLowerCase().includes(group.label.toLowerCase());

                  if (isSingleDirect) {
                    const item = group.children[0];
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          active
                            ? "bg-blue text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <group.icon
                          className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-gray-400")}
                        />
                        {group.label}
                      </Link>
                    );
                  }

                  return (
                    <div key={group.label}>
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                          isGroupActive
                            ? "text-blue bg-blue/5"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <group.icon
                          className={cn("w-4 h-4 shrink-0", isGroupActive ? "text-blue" : "text-gray-400")}
                        />
                        <span className="flex-1">{group.label}</span>
                        {isOpen
                          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      </button>

                      {isOpen && (
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                          {group.children.map((item) => {
                            const active = isItemActive(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                                  active
                                    ? "bg-blue text-white font-medium shadow-sm"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                                )}
                              >
                                <item.icon
                                  className={cn("w-3.5 h-3.5 shrink-0", active ? "text-white" : "text-gray-400")}
                                />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: Settings + version badge */}
      <div className="px-3 pb-2 shrink-0">
        <div className="h-px bg-gray-100 mb-2" />
        {/* Settings pinned */}
        <Link
          href={settingsItem.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            isItemActive(settingsItem.href)
              ? "bg-blue text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <settingsItem.icon
            className={cn(
              "w-4 h-4 shrink-0",
              isItemActive(settingsItem.href) ? "text-white" : "text-gray-400",
            )}
          />
          {settingsItem.label}
        </Link>
      </div>

      {/* Version badge */}
      <div className="px-5 pb-5 shrink-0">
        <div className="rounded-xl bg-blue/5 border border-blue/10 p-3">
          <p className="text-xs font-semibold text-blue">Scath Platform v1.0</p>
          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
            Logged in as <span className="font-medium">{role.toLowerCase() || "admin"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
