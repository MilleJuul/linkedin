"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  BarChart2,
  LogOut,
  ChevronDown,
  Building2,
  Plus,
  Upload,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  workspaceSlug: string;
  workspaceName: string;
  allWorkspaces: { id: string; name: string; slug: string }[];
  user: { name: string | null; email: string };
  userRole: string;
}

const navItems = [
  {
    label: "Overblik",
    href: "overview",
    icon: LayoutDashboard,
  },
  {
    label: "Klargjorte posts",
    href: "prepared",
    icon: FileText,
  },
  {
    label: "Bibliotek",
    href: "library",
    icon: Image,
  },
  {
    label: "Indstillinger",
    href: "settings",
    icon: Settings,
  },
  {
    label: "Indsigter",
    href: "insights",
    icon: BarChart2,
  },
  {
    label: "Data / Import",
    href: "import",
    icon: Upload,
  },
];

export default function Sidebar({
  workspaceSlug,
  workspaceName,
  allWorkspaces,
  user,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const [wsOpen, setWsOpen] = useState(false);

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrator",
    EDITOR: "Redaktør",
    APPROVER: "Godkender",
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Workspace switcher */}
      <div className="p-4 border-b border-gray-100">
        <button
          onClick={() => setWsOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition group"
        >
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{workspaceName}</p>
            <p className="text-xs text-gray-400">{roleLabel[userRole] ?? userRole}</p>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform flex-shrink-0",
              wsOpen && "rotate-180"
            )}
          />
        </button>

        {wsOpen && (
          <div className="mt-1 py-1 bg-white rounded-lg border border-gray-200 shadow-sm absolute z-50 w-52">
            {allWorkspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/app/${ws.slug}/overview`}
                onClick={() => setWsOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition",
                  ws.slug === workspaceSlug && "text-blue-600 bg-blue-50"
                )}
              >
                <Building2 className="w-4 h-4" />
                <span className="truncate">{ws.name}</span>
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <Link
                href="/onboarding"
                onClick={() => setWsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nyt workspace</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const href = `/app/${workspaceSlug}/${item.href}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-blue-600" : "text-gray-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-gray-600">
              {(user.name ?? user.email)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name ?? user.email}
            </p>
            {user.name && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1 rounded hover:bg-gray-100 transition flex-shrink-0"
            title="Log ud"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}
