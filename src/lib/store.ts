import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Client-side UI state only.
 *
 * Business data (listings, enquiries, posts, clubs) now lives in the Neon
 * database and is accessed via server functions in:
 *   - src/lib/listings/public-server.ts   (public reads)
 *   - src/lib/listings/admin-server.ts    (admin reads/writes)
 *   - src/lib/enquiries/server.ts         (buyer submissions)
 *
 * What stays here: per-browser, per-session UI state that doesn't need to
 * persist server-side — the user's saved cars, saved parts, and compare bay.
 */

interface AppState {
  savedCars: string[];
  savedParts: string[];
  compareIds: string[];
  toggleSavedCar: (id: string) => void;
  toggleSavedPart: (id: string) => void;
  toggleCompare: (id: string) => boolean;
  clearCompare: () => void;
}

const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

export const useGarii = create<AppState>()(
  persist(
    (set, get) => ({
      savedCars: [],
      savedParts: [],
      compareIds: [],
      toggleSavedCar: (id) =>
        set({
          savedCars: get().savedCars.includes(id)
            ? get().savedCars.filter((x) => x !== id)
            : [...get().savedCars, id],
        }),
      toggleSavedPart: (id) =>
        set({
          savedParts: get().savedParts.includes(id)
            ? get().savedParts.filter((x) => x !== id)
            : [...get().savedParts, id],
        }),
      toggleCompare: (id) => {
        const cur = get().compareIds;
        if (cur.includes(id)) {
          set({ compareIds: cur.filter((x) => x !== id) });
          return true;
        }
        if (cur.length >= 3) return false;
        set({ compareIds: [...cur, id] });
        return true;
      },
      clearCompare: () => set({ compareIds: [] }),
    }),
    {
      name: "88motorstores-ke",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : localStorage,
      ),
    },
  ),
);