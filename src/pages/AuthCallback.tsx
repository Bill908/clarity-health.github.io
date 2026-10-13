import { LoaderCircle } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useSessionContext } from "@/components/SessionContextProvider";

function AuthCallback() {
  const { session, loading } = useSessionContext();

  if (!loading) return <Navigate to={session ? "/?view=community" : "/login"} replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-5 text-[#183d3a]">
      <div className="flex items-center gap-3 rounded-full border border-[#d8e4dc] bg-white px-5 py-3 text-sm font-semibold text-[#52726b] shadow-sm">
        <LoaderCircle size={17} className="animate-spin text-[#0f766e]" /> Completing sign in…
      </div>
    </main>
  );
}

export default AuthCallback;
