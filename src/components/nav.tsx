"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  User,
  Menu,
  X,
  Calendar,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/calendar", label: "Tee Sheet", icon: CalendarDays },
  { href: "/propose", label: "Caddie", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const displayName = profile?.full_name || null;

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "?";
  };

  async function handleLogout() {
    // Server-side logout to clear httpOnly cookies
    await fetch('/api/auth/logout', { method: 'POST' });
    // Client-side signout
    await supabase.auth.signOut();
    // Clear any remaining supabase cookies
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0];
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    window.location.href = "/login";
  }

  return (
    <>
      {/* Desktop nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900 border-b border-dark-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/feed" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="text-2xl">{"\u26F3"}</span>
              <span>Sleft Golf</span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-900/50 text-emerald-400"
                        : "text-gray-400 hover:bg-dark-800 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User section (desktop) */}
            <div className="hidden md:flex items-center gap-3">
              {profile ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-dark-600 flex items-center justify-center text-xs font-bold">
                    {getInitials()}
                  </div>
                  {displayName && (
                    <span className="text-sm text-gray-400">{displayName}</span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-dark-800 transition-colors"
                    title="Log out"
                  >
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-dark-800 transition-colors"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-out panel */}
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-dark-900 text-white shadow-2xl pt-20 px-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dark-700">
              {profile ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-emerald-400 flex items-center justify-center text-sm font-bold">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {displayName || "Golfer"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-dark-800 hover:text-white transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile links */}
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-dark-800 text-emerald-400"
                        : "text-gray-400 hover:bg-dark-800 hover:text-white"
                    }`}
                  >
                    <Icon size={20} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {/* Logout */}
              {profile && (
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-dark-800 hover:text-red-400 transition-colors mt-4 border-t border-dark-700 pt-4"
                >
                  <LogOut size={20} />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
