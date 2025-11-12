import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  isMobile: boolean;
  activeModal: string | null;
  notifications: Notification[];
  isOnline: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  setOnline: (online: boolean) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  isMobile: false,
  activeModal: null,
  notifications: [],
  isOnline: navigator.onLine,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setIsMobile: (mobile) => set({ isMobile: mobile }),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: Date.now().toString() },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setOnline: (online) => set({ isOnline: online }),
}));

// Listen to online/offline events
window.addEventListener('online', () => useUIStore.getState().setOnline(true));
window.addEventListener('offline', () => useUIStore.getState().setOnline(false));
