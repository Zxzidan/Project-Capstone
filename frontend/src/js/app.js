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
    
    // Improved landing page detection
    const isLandingPage = path === '/' || path === '/index.html' || path.endsWith('/index.html') || path === '' || path === '/landing.html';
    
    if (isLandingPage) {
      return;
    }

    if (!this.user && !isAuthPage) {
      window.location.href = '/pages/auth/login.html';
    } else if (this.user) {
      // If logged in and on login/signup page, go to dashboard
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
      // Pre-fill email/username and password if saved in sessionStorage
      const prefillData = sessionStorage.getItem('tempLoginPrefill');
      if (prefillData) {
        try {
          const data = JSON.parse(prefillData);
          if (data.username && loginForm.email) loginForm.email.value = data.username;
          if (data.password && loginForm.password) loginForm.password.value = data.password;
        } catch (e) {}
        sessionStorage.removeItem('tempLoginPrefill');
      } else {
        // Fallback to URL param for email if present
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        if (emailParam && loginForm.email) {
          loginForm.email.value = emailParam;
        }
      }

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        try {
          const res = await api.login(email, password);
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          window.location.href = '/pages/desktop/dashboard.html';
        } catch (error) {
          if (error.message === 'User not found') {
            window.location.href = `/pages/auth/signup.html?email=${encodeURIComponent(email)}`;
          } else {
            alert('Login failed: ' + error.message);
          }
        }
      });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const signupData = {};
        formData.forEach((value, key) => {
          if (['monthlyIncome', 'assetValue', 'loanAmount', 'monthlyDebt'].includes(key)) {
            signupData[key] = parseFloat(value.replace(/\./g, '')) || 0;
          } else {
            signupData[key] = value;
          }
        });

        try {
          const res = await api.signup(signupData);
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          // Dashboard now since onboarding is skipped
          window.location.href = '/pages/desktop/dashboard.html';
        } catch (error) {
          if (error.message.includes('sudah terdaftar')) {
            sessionStorage.setItem('tempLoginPrefill', JSON.stringify({
              username: signupData.username || signupData.email,
              password: signupData.password
            }));
            window.location.href = '/pages/auth/login.html';
          } else {
            alert('Signup failed: ' + error.message);
          }
        }
      });
      
      // Save partial credentials if they click a "Log in" link directly
      const loginLinks = document.querySelectorAll('a[href="/pages/auth/login.html"]');
      loginLinks.forEach(link => {
        link.addEventListener('click', () => {
          const email = signupForm.email ? signupForm.email.value : '';
          const username = signupForm.username ? signupForm.username.value : '';
          const password = signupForm.password ? signupForm.password.value : '';
          if (email || username || password) {
            sessionStorage.setItem('tempLoginPrefill', JSON.stringify({
              username: username || email,
              password: password
            }));
          }
        });
      });

      // Pre-fill email if passed in URL
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        if(signupForm.email) signupForm.email.value = emailParam;
        else if(signupForm.username) signupForm.username.value = emailParam;
      }
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
        window.location.href = '/';
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
