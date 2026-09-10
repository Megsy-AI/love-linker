import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPaidUser } from "@/lib/subscriptionGating";
import { getCachedUser } from "@/lib/cachedUser";
import { getOwnProfile } from "@/lib/ownProfile";
import { getActiveSubscriptionPlan } from "@/lib/effectivePlan";

export function useUserPlan() {
  const [plan, setPlan] = useState<string>("free");
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = await getCachedUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Prefer server-side truth via has_paid_plan RPC.
      const { data: paid } = await supabase.rpc("has_paid_plan", { p_user_id: user.id });
      if (typeof paid === "boolean") setIsPaid(paid);

      const [data, sub] = await Promise.all([
        getOwnProfile(user.id),
        getActiveSubscriptionPlan(user.id),
      ]);
      if (data) {
        const p = (data.plan || "free").toString().toLowerCase();
        setPlan(p);
        if (typeof paid !== "boolean") setIsPaid(isPaidUser(p));
      }
      // An active paid subscription overrides a stale `free` profile column.
      if (sub) {
        setPlan(sub.plan);
        setIsPaid(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  return { plan, isPaid, loading };
}
