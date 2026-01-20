"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      if (data.user) {
        // Wait a bit for session to be saved
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Force a hard navigation to ensure middleware picks up the session
        window.location.href = "/";
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao fazer login";
      console.error("Login failed:", err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background p-4 sm:p-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-2xl mb-6 relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white relative z-10" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-5 w-5 text-primary animate-ping" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent mb-3">
            Lacosta Solutions
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Sistema de Gestão de Renovações
          </p>
        </div>

        {/* Login Card */}
        <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-border/50 p-6 sm:p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Entre com suas credenciais para continuar
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="relative pl-11 h-12 sm:h-14 text-base bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all duration-200"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Senha
                </Label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="relative pl-11 h-12 sm:h-14 text-base bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all duration-200"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive p-4 rounded-lg text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="flex-1">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 sm:h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4" />
                    Entrar
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 animate-in fade-in duration-500 delay-300">
          © 2024 Lacosta Solutions. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

