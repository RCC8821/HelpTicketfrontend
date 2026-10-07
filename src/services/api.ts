

import { Platform } from 'react-native';

// 🚀 Vercel Live Backend URL
export const API_BASE_URL = 'https://help-ticket-backend.vercel.app/api';
// export const API_BASE_URL = 'http://localhost:8000/api';

// In-Memory cache for dropdowns to prevent multiple network requests
let cachedDropdowns: any = null;

export const api = {
  // 1️⃣ User Login
  login: async (email: string, password: string) => {
    try {
      console.log('🔗 Calling Login API:', `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();
      console.log('📩 Login Response:', data);
      return data;
    } catch (error: any) {
      console.error('💥 Login API Error:', error);
      return { 
        success: false, 
        message: error.message || 'Server se connect nahi ho paya. Check internet connection.' 
      };
    }
  },

  // 2️⃣ Get Tickets List
  getTickets: async (userName: string, filterType: string = 'action') => {
    try {
      console.log(`🔗 Fetching ${filterType} tickets for:`, userName);

      const response = await fetch(
        `${API_BASE_URL}/tickets?userName=${encodeURIComponent(userName)}&filterType=${filterType}`
      );
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('💥 Get Tickets API Error:', error);
      return { 
        success: false, 
        data: [], 
        counts: { action: 0, raised: 0, assigned: 0 },
        message: error.message || 'Tickets fetch nahi ho paye.'
      };
    }
  },

  // 3️⃣ Get Dropdowns (Cached in-memory)
  getDropdowns: async (forceRefresh = false) => {
    try {
      if (cachedDropdowns && !forceRefresh) {
        console.log('⚡ [FRONTEND CACHE] Dropdowns returned from memory');
        return cachedDropdowns;
      }
      
      console.log('🌐 Fetching Dropdowns from Network...');
      const response = await fetch(`${API_BASE_URL}/tickets/dropdowns`);
      const data = await response.json();
      
      if (data && data.success) {
        cachedDropdowns = data; // Save to memory cache
      }
      return data;
    } catch (error: any) {
      console.error('💥 Get Dropdowns API Error:', error);
      return { success: false, locations: [], pcs: [], solvers: [] };
    }
  },

  // 4️⃣ Create New Ticket
  createTicket: async (ticketData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('💥 Create Ticket API Error:', error);
      return { success: false, message: error.message || 'Ticket submit nahi ho paya.' };
    }
  },

   // 5️⃣ Update Ticket Actions (Accept, Reject, Solve, Verify, Close, Reraise)
  updateTicketAction: async (actionType: string, payload: any) => {
    try {
      const ticketId = payload.ticketId || payload.id;

      const bodyData = {
        actionType: actionType, // for actionType
        action: actionType,     // for action
        ticketId: ticketId,     // for ticketId
        id: ticketId,           // for id
        ...payload              // status, remark, nextDate etc.
      };

      console.log('🔗 Sending Ticket Action Payload:', bodyData);

      const response = await fetch(`${API_BASE_URL}/tickets/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();
      console.log('📩 Action API Response:', data);

      if (!response.ok) {
        return { 
          success: false, 
          message: data.message || data.error || `Server Error (${response.status})` 
        };
      }

      return data;
    } catch (error: any) {
      console.error('💥 Ticket Action API Error:', error);
      return { success: false, message: error.message || 'Action update nahi ho paya.' };
    }
  },

  submitAction: async (actionType: string, payload: any) => {
    return api.updateTicketAction(actionType, payload);
  }
};