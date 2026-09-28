// frontend/src/context/TicketContext.tsx
import React, { createContext, useContext, useState, useRef } from 'react';
import { api } from '../services/api';

interface TicketContextType {
  tickets: any[];
  counts: { action: number; raised: number; assigned: number };
  stats: any;
  loading: boolean;
  dropdowns: { locations: string[]; pcs: string[]; solvers: string[] };
  loadingDropdowns: boolean;
  fetchTickets: (userName: string, filterType: string, forceRefresh?: boolean) => Promise<any>;
  fetchDropdowns: (forceRefresh?: boolean) => Promise<any>;
  clearCache: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [counts, setCounts] = useState({ action: 0, raised: 0, assigned: 0 });
  const [stats, setStats] = useState({ weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0 });
  const [loading, setLoading] = useState(false);
  
  // Dropdowns cache state
  const [dropdowns, setDropdowns] = useState({ locations: [], pcs: [], solvers: [] });
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // In-memory caching variables
  const [cacheMap, setCacheMap] = useState<Map<string, { data: any; counts: any; stats: any; timestamp: number }>>(new Map());

  // 🔥 Duplicate API Call Guard (In-flight requests tracking)
  const inFlightRequests = useRef<Set<string>>(new Set());

  // Fetch or Load cached Tickets
  const fetchTickets = async (userName: string, filterType: string, forceRefresh = false) => {
    const cacheKey = `${userName}_${filterType}`;
    const now = Date.now();
    const cached = cacheMap.get(cacheKey);

    // 1. Agar Cache me hai aur fresh hai (2 mins se kam purana), to cache return karo
    if (cached && !forceRefresh && (now - cached.timestamp < 120000)) {
      console.log(`⚡ [FRONTEND CONTEXT CACHE] Cache Hit for: ${cacheKey}`);
      setTickets(cached.data);
      setCounts(cached.counts);
      setStats(cached.stats);
      return { success: true, data: cached.data };
    }

    // 2. Agar pehle se same request chal rahi hai, to ruk jao (Double API call roko)
    if (inFlightRequests.current.has(cacheKey) && !forceRefresh) {
      return { success: true, message: 'Request already in progress' };
    }

    // Request lock kar do
    inFlightRequests.current.add(cacheKey);
    setLoading(true);

    try {
      console.log(`🌐 [API FETCH] Fetching from server for: ${cacheKey}`);
      const res = await api.getTickets(userName, filterType);
      
      if (res && res.success) {
        setTickets(res.data || []);
        setCounts(res.counts || { action: 0, raised: 0, assigned: 0 });
        if (res.myStats) setStats(res.myStats);

        // Update in-memory cache map
        const newCache = new Map(cacheMap);
        newCache.set(cacheKey, {
          data: res.data || [],
          counts: res.counts || { action: 0, raised: 0, assigned: 0 },
          stats: res.myStats || { weekRaised: 0, monthRaised: 0, weekSolved: 0, monthSolved: 0 },
          timestamp: now
        });
        setCacheMap(newCache);
      }
      return res;
    } catch (e) {
      console.error('Error fetching tickets in context:', e);
      return { success: false, data: [] };
    } finally {
      // Request puri hone ke baad lock hata do
      inFlightRequests.current.delete(cacheKey);
      setLoading(false);
    }
  };

  // Fetch or Load cached Dropdowns
  const fetchDropdowns = async (forceRefresh = false) => {
    if (dropdowns.locations.length > 0 && !forceRefresh) {
      return { success: true, ...dropdowns };
    }

    setLoadingDropdowns(true);
    try {
      const res = await api.getDropdowns(forceRefresh);
      if (res && res.success) {
        const payload = {
          locations: res.locations || [],
          pcs: res.pcs || [],
          solvers: res.solvers || []
        };
        setDropdowns(payload);
        return { success: true, ...payload };
      }
      return res;
    } catch (e) {
      console.error('Error loading dropdowns:', e);
      return { success: false };
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Clear Cache when Ticket gets Created or Status updates
  const clearCache = () => {
    console.log('🗑️ [FRONTEND CACHE CLEAR] Clearing all cached tickets');
    setCacheMap(new Map());
  };

  return (
    <TicketContext.Provider value={{
      tickets, counts, stats, loading, dropdowns, loadingDropdowns,
      fetchTickets, fetchDropdowns, clearCache
    }}>
      {children}
    </TicketContext.Provider>
  );
}

// Custom hook to consume TicketContext easily
export function useTickets() {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
}