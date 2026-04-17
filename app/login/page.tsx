"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listenToAuth,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
  resetUserPassword,
} from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

type AuthMode = "login" | "register" | "reset";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = listenToAuth(setUser);
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true);
      await loginWithGoogle();
      router.push("/team");
    } catch (error) {
      console.error(error);
      alert("Erro ao iniciar sessão com Google.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Preenche o email e a password.");
      return;
    }

    try {
      setLoadingForm(true);
      await loginWithEmail(email.trim(), password);
      router.push("/team");
    } catch (error: any) {
      console.error(error);
      alert("Não foi possível iniciar sessão com email e password.");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      alert("Preenche o teu nome.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      alert("Preenche o email e a password.");
      return;
    }

    if (password.length < 6) {
      alert("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setLoadingForm(true);
      await registerWithEmail(name.trim(), email.trim(), password);
      router.push("/team");
    } catch (error: any) {
      console.error(error);
      alert("Não foi possível criar a conta.");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      alert("Introduce o teu email para receberes o link de recuperação.");
      return;
    }

    try {
      setLoadingForm(true);
      await resetUserPassword(email.trim());
      alert("Enviámos um email para recuperares a password.");
      setMode("login");
    } catch (error: any) {
      console.error(error);
      alert("Não foi possível enviar o email de recuperação.");
    } finally {
      setLoadingForm(false);
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
              {user
                ? "A tua conta"
                : mode === "register"
                ? "Criar conta"
                : mode === "reset"
                ? "Recuperar password"
                : "Login"}
            </h1>

            <p className="mt-4 max-w-2xl text-sm opacity-90 sm:text-base">
              {user
                ? "A tua sessão está ativa. A partir daqui podes ir diretamente para a tua equipa."
                : "Entra com Google ou usa email e password para criares a tua conta, guardares os teus picks e participares no ranking da fantasy."}
            </p>
          </div>

          <div className="p-5 sm:p-8">
            {!user ? (
              <>
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      mode === "login"
                        ? "bg-violet-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Entrar
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      mode === "register"
                        ? "bg-violet-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Criar conta
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      mode === "reset"
                        ? "bg-violet-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Recuperar password
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                    {mode === "register"
                      ? "Nova conta"
                      : mode === "reset"
                      ? "Recuperação"
                      : "Acesso"}
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                    {mode === "register"
                      ? "Cria a tua conta"
                      : mode === "reset"
                      ? "Recupera o acesso"
                      : "Entra na tua conta"}
                  </h2>

                  <p className="mt-3 text-sm text-gray-600 sm:text-base">
                    {mode === "register"
                      ? "Regista-te com email e password para participares na fantasy."
                      : mode === "reset"
                      ? "Recebe por email um link para redefinires a tua password."
                      : "Usa o teu email e password ou entra com Google."}
                  </p>

                  <div className="mt-6 grid gap-4">
                    {mode === "register" && (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="O teu nome"
                          className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-violet-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="o.teu.email@email.com"
                        className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-violet-500"
                      />
                    </div>

                    {mode !== "reset" && (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-violet-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    {mode === "register" ? (
                      <button
                        type="button"
                        onClick={handleRegister}
                        disabled={loadingForm}
                        className="w-full rounded-xl bg-violet-900 px-6 py-4 text-base font-semibold text-white transition disabled:opacity-60"
                      >
                        {loadingForm ? "A criar conta..." : "Criar conta"}
                      </button>
                    ) : mode === "reset" ? (
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={loadingForm}
                        className="w-full rounded-xl bg-violet-900 px-6 py-4 text-base font-semibold text-white transition disabled:opacity-60"
                      >
                        {loadingForm
                          ? "A enviar..."
                          : "Enviar email de recuperação"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleEmailLogin}
                        disabled={loadingForm}
                        className="w-full rounded-xl bg-violet-900 px-6 py-4 text-base font-semibold text-white transition disabled:opacity-60"
                      >
                        {loadingForm ? "A entrar..." : "Entrar com email"}
                      </button>
                    )}
                  </div>
                </div>

                {mode !== "reset" && (
                  <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="text-sm text-gray-500">Ou, em alternativa</p>
                    <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                      Google Sign-In
                    </p>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loadingGoogle}
                      className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      {loadingGoogle
                        ? "A entrar com Google..."
                        : "Entrar com Google"}
                    </button>
                  </div>
                )}
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