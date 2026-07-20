import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { SubscriptionPlan } from "@/types";

interface AuthState {
  user: User | null;
  plan: SubscriptionPlan;
  isPremium: boolean;
  hydrated: boolean;
  setUser: (user: User | null) => void;
}

function planFromUser(user: User | null): { plan: SubscriptionPlan; isPremium: boolean } {
  const plan = (user?.user_metadata?.plan as SubscriptionPlan) || "FREE";
  const isPremium = plan === "ACTIVE" || plan === "TRIAL";
  return { plan, isPremium };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  plan: "FREE",
  isPremium: false,
  hydrated: false,
  setUser: (user) => set({ user, hydrated: true, ...planFromUser(user) }),
}));
