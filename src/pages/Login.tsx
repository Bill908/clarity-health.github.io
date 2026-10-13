import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/components/SessionContextProvider";

function Login() {
  const { session, loading } = useSessionContext();
  const callbackUrl = new URL("/auth/callback", window.location.origin).href;

  if (!loading && session) return <Navigate to="/?view=community" replace />;

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-10 text-[#183d3a] sm:px-8">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e] hover:underline">
          <ArrowLeft size={16} /> Back to Clarity
        </Link>
        <section className="rounded-[28px] border border-[#d8e4dc] bg-white p-6 shadow-[0_16px_45px_rgba(40,75,67,0.08)] sm:p-8">
          <div className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f2e8] text-[#0f766e]"><ShieldCheck size={21} /></div>
            <h1 className="font-serif text-[32px] font-semibold tracking-[-0.04em] text-[#183d3a]">Join the community.</h1>
            <p className="mt-2 text-sm leading-6 text-[#68837c]">Sign in to read and participate in the Clarity Commons. Your community posts will be visible to signed-in members.</p>
          </div>
          <Auth
            supabaseClient={supabase}
            redirectTo={callbackUrl}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#0f766e",
                    brandAccent: "#0a655f",
                    inputBorder: "#d8e4dc",
                    inputBorderFocus: "#0f766e",
                  },
                  radii: {
                    borderRadiusButton: "999px",
                    inputBorderRadius: "12px",
                  },
                },
              },
            }}
            theme="light"
          />
        </section>
      </div>
    </main>
  );
}

export default Login;
