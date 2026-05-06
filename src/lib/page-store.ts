import { create } from "zustand";

export type PageView =
  | "home"
  | "checkout"
  | "payment"
  | "payment-status"
  | "eticket"
  | "my-orders"
  | "profile"
  | "admin";

interface PageState {
  currentPage: PageView;
  currentOrderId: string | null;
  navigateTo: (page: PageView, orderId?: string | null) => void;
  goHome: () => void;
  goBack: () => void;
}

export const usePageStore = create<PageState>((set) => ({
  currentPage: "home",
  currentOrderId: null,

  navigateTo: (page, orderId = null) => {
    set({ currentPage: page, currentOrderId: orderId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  goHome: () => {
    set({ currentPage: "home", currentOrderId: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  goBack: () => {
    set({ currentPage: "home", currentOrderId: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
}));
