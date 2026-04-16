// src/hooks/useSubscription.js
// Check if business subscription is active + REALTIME auto-unlock

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { daysRemaining } from "../lib/helpers";

export function useSubscription(business) {
  const [isActive, setIsActive] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState("");
  const [price, setPrice] = useState("10000");

  const checkStatus = useCallback(async () => {
    if (!business) {
      setLoading(false);
      return;
    }

    try {
      // Get settings
      const { data: settings } = await supabase
        .from("system_settings")
        .select("*");

      if (settings) {
        const pi = settings.find((s) => s.setting_key === "payment_info");
        const pr = settings.find((s) => s.setting_key === "subscription_price");
        if (pi) setPaymentInfo(pi.setting_value);
        if (pr) setPrice(pr.setting_value);
      }

      // Check trial
      const trialDays = daysRemaining(business.trial_ends_at);
      if (trialDays > 0) {
        setIsTrial(true);
        setIsActive(true);
        setDaysLeft(trialDays);
        setLoading(false);
        return;
      }

      // Check active token
      const { data: token } = await supabase
        .from("tokens")
        .select("*")
        .eq("business_id", business.id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (token) {
        setIsActive(true);
        setIsTrial(false);
        setDaysLeft(daysRemaining(token.expires_at));
      } else {
        setIsActive(false);
        setIsTrial(false);
        setDaysLeft(0);
      }
    } catch (err) {
      console.error("Subscription check error:", err);
      setIsActive(false);
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 🔥 REALTIME: Listen for new tokens for this business
  // When admin approves payment, a new token is auto-created with status=active
  // This effect detects it and unlocks the system immediately!
  useEffect(() => {
    if (!business?.id) return;

    const channel = supabase
      .channel(`tokens-${business.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT or UPDATE
          schema: "public",
          table: "tokens",
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          console.log("🎉 Token change detected:", payload);
          // Re-check subscription status
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, checkStatus]);

  return { isActive, isTrial, daysLeft, loading, paymentInfo, price, refresh: checkStatus };
}
