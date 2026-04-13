"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listenToAuth, loginWithGoogle, logoutUser } from "@/lib/auth";

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
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-md">

          {/* HEADER */}
          <div
            className="relative px-8 py-10"
            style={{
              background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
              color: "#ffffff",
            }}
          >
            {/* BOTÃO FECHAR */}
            <Link
              href="/"
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full transition"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ✕
            </Link>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-80">
              Fantasy Mundial 2026
            </p>

            <h1 className="mt-3 text-4xl font-extrabold leading-tight">
              Login
            </h1>

            <p className="mt-4 max-w-2xl text-base opacity-90">
              Entra com a tua conta Google para criares a tua equipa,
              guardares os teus picks e participares no ranking da fantasy.
            </p>
          </div>

          {/* BODY */}
          <div className="p-8">
            {!user ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                  Acesso
                </p>

                <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
                  Entra na tua conta
                </h2>

                <p className="mt-3 text-base text-gray-600">
                  Usa o teu Google para entrar rapidamente e começar a jogar.
                </p>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Método de login</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    Google Sign-In
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl px-6 py-4 text-base font-semibold transition"
                  style={{
                    backgroundColor: "#4c1d95",
                    color: "#ffffff",
                    border: "none",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "A entrar..." : "Entrar com Google"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                  Sessão iniciada
                </p>

                <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
                  Bem-vindo
                </h2>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Utilizador</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {user.displayName || "Utilizador"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {user.email}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/team")}
                    className="flex-1 rounded-xl px-6 py-4 text-base font-semibold"
                    style={{
                      backgroundColor: "#4c1d95",
                      color: "#ffffff",
                      border: "none",
                    }}
                  >
                    Ir para a minha equipa
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 rounded-xl px-6 py-4 text-base font-semibold"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                    }}
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