const API_URL = '/_backend/api';

// Helper untuk safe parsing response
async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export const api = {
  // --- AUTH ---
  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || `Login failed: ${res.status}`);
    return data;
  },

  async signup(data) {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await safeJson(res);
    if (!res.ok) throw new Error(result.error || `Signup failed: ${res.status}`);
    return result;
  },

  // --- TRANSACTIONS ---
  async getTransactions(userId) {
    const res = await fetch(`${API_URL}/transactions?userId=${userId}`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to fetch transactions');
    return data;
  },

  async addTransaction(data) {
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await safeJson(res);
    if (!res.ok) throw new Error(result.error || 'Failed to add transaction');
    return result;
  },

  async updateUserProfile(userId, profileData) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...profileData })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  // --- INSIGHTS ---
  async getInsights(transactions) {
    const res = await fetch(`${API_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to get insights');
    return data;
  }
};