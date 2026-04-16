// src/hooks/useAuth.js
// Authentication hook - manages login state and user data

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("*, businesses(*)")
        .eq("id", userId)
        .single();

      if (profile) {
        setUserProfile(profile);
        if (profile.businesses) {
          setBusiness(profile.businesses);
        } else if (profile.business_id) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("*")
            .eq("id", profile.business_id)
            .single();
          setBusiness(biz);
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user || null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user || null);
      if (s?.user) fetchProfile(s.user.id);
      else {
        setUserProfile(null);
        setBusiness(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserProfile(null);
    setBusiness(null);
  };

  const refreshProfile = () => {
    if (user) fetchProfile(user.id);
  };

  return {
    session,
    user,
    userProfile,
    business,
    loading,
    signOut,
    refreshProfile,
    isAdmin: userProfile?.role === "admin",
    isOffice: userProfile?.role === "office",
    isWorker: userProfile?.role === "worker",
  };
}
