/** @doc WelcomeShowcasePage — first-run onboarding showcase before the chat. */
/**
 * WelcomeShowcasePage — first-open onboarding showcase (mobile only).
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FeatureShowcase from "@/components/onboarding/FeatureShowcase";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export default function WelcomeShowcasePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) {
      // Welcome showcase is intended for phone screens only.
      navigate("/chat", { replace: true });
    }
  }, [isMobile, navigate]);

  return (
    <FeatureShowcase
      onFinish={async (target) => {
        try {
          localStorage.setItem("megsy_seen_welcome", "1");
        } catch {}
        // Already signed in → go straight to the app instead of the auth screen.
        let signedIn = false;
        try {
          const { data } = await supabase.auth.getSession();
          signedIn = !!data.session;
        } catch {}
        // The free-trial button goes to checkout; signing in comes first for
        // guests, since the card is linked to their account.
        if (target === "trial") {
          navigate(
            signedIn
              ? "/billing?offer=free_trial"
              : "/auth?next=%2Fbilling%3Foffer%3Dfree_trial",
            { replace: true },
          );
          return;
        }
        navigate(signedIn ? "/chat" : "/auth", { replace: true });
      }}
    />
  );
}
