import { api } from './api.js';

export const app = {
  user: null,

  init() {
    this.user = JSON.parse(localStorage.getItem('currentUser'));
    this.checkAuthGuard();
    this.bindEvents();
    
    // Automatically render specific data based on the current page
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) {
      this.loadDashboardData();
    } else if (path.includes('insights.html')) {
      this.loadInsightsData();
    }
  },

  checkAuthGuard() {
    const path = window.location.pathname;
    const isAuthPage = path.includes('login.html') || path.includes('signup.html') || path.endsWith('/') || path.endsWith('index.html');
    
    if (!this.user && !isAuthPage) {
      window.location.href = '/pages/auth/login.html';
    } else if (this.user && isAuthPage && !path.endsWith('/')) {
      // If logged in and on login page, go to dashboard
      window.location.href = '/pages/desktop/dashboard.html';
    }
    
    // Update UI profile name if logged in
    if (this.user) {
      const profileNames = document.querySelectorAll('.user-profile span');
      profileNames.forEach(span => span.textContent = this.user.name || 'User');
    }
  },

  bindEvents() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        try {
          const res = await api.login(email, password);
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          window.location.href = '/pages/desktop/dashboard.html';
        } catch (error) {
          alert('Login failed: ' + error.message);
        }
      });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        try {
          const res = await api.signup(email, password, name);
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          window.location.href = '/pages/desktop/dashboard.html';
        } catch (error) {
          alert('Signup failed: ' + error.message);
        }
      });
    }

    const addTxForm = document.getElementById('addTxForm');
    if (addTxForm) {
      addTxForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          userId: this.user.id,
          amount: e.target.amount.value,
          type: e.target.type ? e.target.type.value : 'Expense',
          category: e.target.category ? e.target.category.value : 'General',
          date: e.target.date ? e.target.date.value : new Date().toISOString(),
          notes: e.target.notes ? e.target.notes.value : ''
        };
        try {
          await api.addTransaction(data);
          window.location.href = '/pages/desktop/dashboard.html';
        } catch (error) {
          alert('Failed to add transaction: ' + error.message);
        }
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/pages/auth/login.html';
      });
    }
  },

  async loadDashboardData() {
    if (!this.user) return;
    try {
      const transactions = await api.getTransactions(this.user.id);
      
      // Calculate totals
      let balance = 0;
      let monthlySpending = 0;
      
      transactions.forEach(t => {
        if (t.type === 'Income') balance += t.amount;
        else {
          balance -= t.amount;
          monthlySpending += t.amount;
        }
      });

      // Update DOM
      const balanceEl = document.getElementById('totalBalance');
      const spendingEl = document.getElementById('monthlySpending');
      if (balanceEl) balanceEl.textContent = 'Rp ' + balance.toLocaleString('id-ID');
      if (spendingEl) spendingEl.textContent = 'Rp ' + monthlySpending.toLocaleString('id-ID');

      // Render transactions
      const txList = document.getElementById('transactionList');
      if (txList) {
        txList.innerHTML = '';
        if (transactions.length === 0) {
          txList.innerHTML = '<div class="p-4 text-center text-muted">No transactions yet.</div>';
          return;
        }
        
        transactions.slice().reverse().forEach(t => {
          const isIncome = t.type === 'Income';
          txList.innerHTML += `
            <div class="transaction-row flex justify-between p-4 border-b border-gray-700">
              <div class="flex items-center">
                <div class="t-icon mr-4">💰</div>
                <div>
                  <div class="font-bold">${t.category}</div>
                  <div class="text-sm text-muted">${t.date}</div>
                </div>
              </div>
              <div class="font-bold ${isIncome ? 'text-success' : 'text-danger'}">
                ${isIncome ? '+' : '-'}Rp ${t.amount.toLocaleString('id-ID')}
              </div>
            </div>
          `;
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  },

  async loadInsightsData() {
    if (!this.user) return;
    try {
      const transactions = await api.getTransactions(this.user.id);
      const res = await api.getInsights(transactions);
      
      const insightsContainer = document.getElementById('aiInsightsContainer');
      if (insightsContainer && res.insights) {
        insightsContainer.innerHTML = '';
        res.insights.forEach(insight => {
          let icon = insight.type === 'warning' ? '⚠️' : (insight.type === 'success' ? '✅' : '🤖');
          insightsContainer.innerHTML += `
            <div class="insight-card ${insight.type} mb-4">
              <div class="flex items-center gap-2 mb-2">
                <span>${icon}</span>
                <span class="font-bold text-sm">${insight.title}</span>
              </div>
              <p class="text-sm text-secondary m-0">${insight.message}</p>
            </div>
          `;
        });
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
