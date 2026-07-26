import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  currency: string;
  currencySymbol: string;
  language: string;
  printerName: string | null;
  lastPaymentMethod: string;
  setTheme: (t: UIState["theme"]) => void;
  toggleSidebar: () => void;
  setCurrency: (currency: string, symbol: string) => void;
  setLanguage: (lang: string) => void;
  setPrinter: (name: string | null) => void;
  setLastPaymentMethod: (method: string) => void;
}

// Lightweight preferences ONLY — never business data. Persisted to localStorage.
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarCollapsed: false,
      currency: "USD",
      currencySymbol: "$",
      language: "en",
      printerName: null,
      lastPaymentMethod: "CASH",
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCurrency: (currency, currencySymbol) => set({ currency, currencySymbol }),
      setLanguage: (language) => set({ language }),
      setPrinter: (printerName) => set({ printerName }),
      setLastPaymentMethod: (lastPaymentMethod) => set({ lastPaymentMethod }),
    }),
    { name: "universal-pos-ui-prefs" }
  )
);
