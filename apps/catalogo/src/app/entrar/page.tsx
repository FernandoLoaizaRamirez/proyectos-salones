"use client";

/**
 * ENTRAR — inicio de sesión del staff (operador / salón).
 *
 * Con correo y contraseña. Al entrar, la sesión queda guardada en el navegador y
 * se redirige al panel del operador. El registro de usuarios lo hace el
 * administrador (por ahora, desde el panel de Supabase); esta pantalla solo
 * autentica a quien ya tiene cuenta.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2 } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState("");

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const supabase = obtenerSupabase();
    if (!supabase) {
      setError("El acceso aún no está configurado en este sitio.");
      return;
    }
    setCargando(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (err) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/panel");
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-14">
      <p className="text-sm font-medium text-primary">Acceso del operador</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-2 text-muted-foreground">
        Inicia sesión para administrar tus eventos.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Correo</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Entrando…
              </>
            ) : (
              <>
                <LogIn className="size-4" /> Entrar
              </>
            )}
          </Button>
        </form>
      </Card>
    </main>
  );
}
