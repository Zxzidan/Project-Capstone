const API_URL = 'http://localhost:3000/api';

export const api = {
  // --- AUTH ---
  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async signup(email, password, name) {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  // --- TRANSACTIONS ---
  async getTransactions(userId) {
    const res = await fetch(`${API_URL}/transactions?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async addTransaction(data) {
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add transaction');
    return res.json();
  },

  // --- INSIGHTS ---
  async getInsights(transactions) {
    const res = await fetch(`${API_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    });
    if (!res.ok) throw new Error('Failed to get insights');
    return res.json();
  }
};
