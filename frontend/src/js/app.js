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
    const isAuthPage = path.includes('login.html') || path.includes('signup.html');
    const isLandingPage = path.endsWith('/') || path.endsWith('index.html');
    
    if (!this.user && !isAuthPage && !isLandingPage) {
      window.location.href = '/pages/auth/login.html';
    } else if (this.user) {
      // Check if onboarded
      if (!this.user.onboarded && !path.includes('onboarding.html')) {
        window.location.href = '/pages/auth/onboarding.html';
        return;
      }
      
      // If logged in and on login/signup page, go to dashboard
      // But stay on landing page if already there
      if (isAuthPage) {
        window.location.href = '/pages/desktop/dashboard.html';
      }
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
          window.location.href = '/pages/auth/onboarding.html';
        } catch (error) {
          alert('Signup failed: ' + error.message);
        }
      });
    }

    const addTxForm = document.getElementById('addTxForm');
    if (addTxForm) {
      addTxForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawAmount = e.target.amount.value.replace(/\./g, '');
        const data = {
          userId: this.user.id,
          amount: parseFloat(rawAmount),
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

    const onboardingForm = document.getElementById('onboardingForm');
    if (onboardingForm) {
      onboardingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profileData = {};
        formData.forEach((value, key) => {
          // Strip currency formatting for specific fields
          if (['monthlyIncome', 'assetValue', 'loanAmount', 'monthlyDebt'].includes(key)) {
            profileData[key] = parseFloat(value.replace(/\./g, '')) || 0;
          } else {
            profileData[key] = value;
          }
        });

        try {
          const res = await api.updateUserProfile(this.user.id, profileData);
          // Update local user data
          const updatedUser = { ...this.user, ...res.user, onboarded: true };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.user = updatedUser;
          
          window.location.href = '/pages/desktop/dashboard.html';
        } catch (error) {
          alert('Failed to save profile: ' + error.message);
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
      // Render chart
      this.renderChart(transactions);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  },

  renderChart(transactions) {
    const ctx = document.getElementById('cashFlowChart');
    if (!ctx) return;

    // Group transactions by date
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const dailyData = last7Days.map(date => {
      let income = 0;
      let expense = 0;
      transactions.forEach(t => {
        if (t.date.startsWith(date)) {
          if (t.type === 'Income') income += t.amount;
          else expense += t.amount;
        }
      });
      return { date, income, expense };
    });

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dailyData.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }),
        datasets: [
          {
            label: 'Income',
            data: dailyData.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Expense',
            data: dailyData.map(d => d.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { 
              color: '#94a3b8',
              callback: (value) => 'Rp ' + value.toLocaleString('id-ID')
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
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
          let icon = '';
          insightsContainer.innerHTML += `
            <div class="insight-card ${insight.type} mb-4">
              <div class="flex items-center gap-2 mb-2">
                
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
