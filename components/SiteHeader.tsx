"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { listenToAuth } from "@/lib/auth";

const ADMIN_EMAIL = "zmrolapereira@gmail.com";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/team", label: "A Minha Equipa" },
  { href: "/stats", label: "Estatísticas" },
  { href: "/games", label: "Jogos" },
  { href: "/table", label: "Tabela" },
  { href: "/rules", label: "Info" },
  { href: "/ranking", label: "Ranking" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const links = useMemo(() => {
    return isAdmin
      ? [...baseLinks, { href: "/admin", label: "Admin" }]
      : baseLinks;
  }, [isAdmin]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-4 py-3">
          <Link href="/" className="min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl">
                Fantasy Mundial 2026
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">
                Liga oficial do Mundial
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 md:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            Menu
          </button>

          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "font-semibold text-blue-600"
                      : "text-gray-700 hover:text-blue-600"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {open && (
          <nav className="grid grid-cols-2 gap-2 pb-4 md:hidden">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={
                    active
                      ? "rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600"
                      : "rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}