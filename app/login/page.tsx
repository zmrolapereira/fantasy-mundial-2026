"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listenToAuth, loginWithGoogle, logoutUser } from "@/lib/auth";
import SiteHeader from "@/components/HeaderTemp";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      router.push("/team");
    } catch (error) {
      console.error(error);
      alert("Erro ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error(error);
      alert("Erro ao terminar sessão.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-3xl bg-white shadow-md">
          <div className="relative bg-gradient-to-br from-violet-900 to-violet-600 px-5 py-8 text-white sm:px-8 sm:py-10">
            <Link
              href="/"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white transition hover:bg-white/25"
            >
              ✕
            </Link>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-80">
              Fantasy Mundial 2026
            </p>

            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              Login
            </h1>

            <p className="mt-4 max-w-2xl text-sm opacity-90 sm:text-base">
              Entra com a tua conta Google para criares a tua equipa,
              guardares os teus picks e participares no ranking da fantasy.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            {!user ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                  Acesso
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                  Entra na tua conta
                </h2>

                <p className="mt-3 text-sm text-gray-600 sm:text-base">
                  Usa o teu Google para entrar rapidamente e começar a jogar.
                </p>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Método de login</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                    Google Sign-In
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-violet-900 px-6 py-4 text-base font-semibold text-white transition disabled:opacity-60"
                >
                  {loading ? "A entrar..." : "Entrar com Google"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                  Sessão iniciada
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                  Bem-vindo
                </h2>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Utilizador</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                    {user.displayName || "Utilizador"}
                  </p>
                  <p className="mt-1 break-words text-sm text-gray-500">
                    {user.email}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/team")}
                    className="flex-1 rounded-xl bg-violet-900 px-6 py-4 text-base font-semibold text-white"
                  >
                    Ir para a minha equipa
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-700"
                  >
                    Terminar sessão
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}