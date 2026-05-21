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
    } else if (path.includes('history.html')) {
      this.loadHistoryData();
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

    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
      monthSelector.addEventListener('change', () => {
        this.loadInsightsData();
      });
    }
  },

  async loadDashboardData() {
    if (!this.user) return;

    // Check setup blockers
    const savingGoal = parseFloat(this.user.savingGoal) || 0;
    const monthlyIncome = parseFloat(this.user.monthlyIncome) || 0;

    const setupBlocker = document.getElementById('dashboardEmptyState');
    const dashboardContent = document.getElementById('dashboardContent');

    if (savingGoal <= 0 || monthlyIncome <= 0) {
      if (setupBlocker) setupBlocker.style.display = 'block';
      if (dashboardContent) dashboardContent.style.display = 'none';
      return;
    } else {
      if (setupBlocker) setupBlocker.style.display = 'none';
      if (dashboardContent) dashboardContent.style.display = 'block';
    }

    try {
      const transactions = await api.getTransactions(this.user.id);
      
      // Calculate totals
      let balance = 0;
      let totalIncome = 0;
      let monthlySpending = 0;
      
      transactions.forEach(t => {
        if (t.type === 'Income') {
          balance += t.amount;
          totalIncome += t.amount;
        } else {
          balance -= t.amount;
          monthlySpending += t.amount;
        }
      });

      // Update DOM
      const balanceEl = document.getElementById('totalBalance');
      const incomeEl = document.getElementById('totalIncome');
      const spendingEl = document.getElementById('monthlySpending');
      if (balanceEl) balanceEl.textContent = 'Rp ' + balance.toLocaleString('id-ID');
      if (incomeEl) incomeEl.textContent = 'Rp ' + totalIncome.toLocaleString('id-ID');
      if (spendingEl) spendingEl.textContent = 'Rp ' + monthlySpending.toLocaleString('id-ID');

      // Calculate percentages
      const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : (monthlyIncome > 0 ? Math.round((balance / monthlyIncome) * 100) : 0);
      const incomeRate = monthlyIncome > 0 ? Math.round((totalIncome / monthlyIncome) * 100) : 0;
      const spendingRate = totalIncome > 0 ? Math.round((monthlySpending / totalIncome) * 100) : (monthlyIncome > 0 ? Math.round((monthlySpending / monthlyIncome) * 100) : 0);

      // Update Percentage DOM Elements
      const balancePctEl = document.getElementById('balancePercentage');
      const incomePctEl = document.getElementById('incomePercentage');
      const spendingPctEl = document.getElementById('spendingPercentage');

      if (balancePctEl) {
        if (savingsRate >= 0) {
          balancePctEl.textContent = `Rasio Menabung: ↑ ${savingsRate}% dari pemasukan`;
        } else {
          balancePctEl.textContent = `Defisit Saldo: ↓ ${Math.abs(savingsRate)}% dari pemasukan`;
        }
      }
      if (incomePctEl) {
        const isMobile = window.location.pathname.includes('/mobile/');
        if (isMobile) {
          incomePctEl.textContent = `${incomeRate}% dari target`;
        } else {
          incomePctEl.textContent = `${incomeRate}% dari target bulanan (Rp ${monthlyIncome.toLocaleString('id-ID')})`;
        }
      }
      if (spendingPctEl) {
        spendingPctEl.textContent = `${spendingRate}% dari pemasukan`;
      }

      // Update Savings Goal Card
      const sgValEl = document.getElementById('savingsGoalValue');
      const sgStatEl = document.getElementById('savingsGoalStatus');
      const sgBarEl = document.getElementById('savingsGoalProgressBar');
      
      if (sgValEl) {
        sgValEl.textContent = 'Rp ' + savingGoal.toLocaleString('id-ID');
      }
      if (sgStatEl) {
        // Calculate saving status
        const pct = savingGoal > 0 ? Math.max(0, Math.round((balance / savingGoal) * 100)) : 0;
        const displayPct = Math.min(pct, 100);
        
        sgStatEl.textContent = pct >= 100 ? '100% Tercapai 🎉' : `${displayPct}% on track`;
        
        // Dynamic badge colors and progress bar properties
        if (pct >= 100) {
          sgStatEl.className = 'badge badge-success';
          if (sgBarEl) {
            sgBarEl.style.width = '100%';
            sgBarEl.style.background = 'var(--color-accent)';
          }
        } else if (pct >= 50) {
          sgStatEl.className = 'badge badge-warning';
          if (sgBarEl) {
            sgBarEl.style.width = `${displayPct}%`;
            sgBarEl.style.background = 'var(--color-warning)';
          }
        } else {
          sgStatEl.className = 'badge badge-danger';
          if (sgBarEl) {
            sgBarEl.style.width = `${displayPct}%`;
            sgBarEl.style.background = 'var(--color-danger)';
          }
        }
      }

      // Render transactions
      const txList = document.getElementById('transactionList');
      if (txList) {
        txList.innerHTML = '';
        if (transactions.length === 0) {
          txList.innerHTML = '<div class="p-4 text-center text-secondary">Belum ada transaksi.</div>';
        } else {
          transactions.slice().reverse().forEach(t => {
            const isIncome = t.type === 'Income';
            const icon = isIncome ? '💰' : '🛒';
            
            const isMobile = window.location.pathname.includes('/mobile/');
            if (isMobile) {
              txList.innerHTML += `
                <div class="t-row animate-fade-in">
                  <div class="flex items-center gap-3">
                    <div style="background: ${isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${isIncome ? 'var(--color-accent)' : 'var(--color-danger)'}; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                      ${icon}
                    </div>
                    <div>
                      <div class="font-bold" style="font-size: 0.9rem;">${t.category}</div>
                      <div style="font-size: 0.75rem; color: var(--color-text-muted);">${t.date}</div>
                    </div>
                  </div>
                  <div class="font-bold ${isIncome ? 'text-success' : 'text-danger'}" style="font-size: 0.95rem;">
                    ${isIncome ? '+' : '-'}Rp ${t.amount.toLocaleString('id-ID')}
                  </div>
                </div>
              `;
            } else {
              txList.innerHTML += `
                <div class="transaction-row flex justify-between p-4 border-b border-gray-700 animate-fade-in">
                  <div class="flex items-center">
                    <div class="t-icon">${icon}</div>
                    <div>
                      <div class="font-bold">${t.category}</div>
                      <div class="text-sm text-secondary">${t.date}</div>
                    </div>
                  </div>
                  <div class="font-bold ${isIncome ? 'text-success' : 'text-danger'}">
                    ${isIncome ? '+' : '-'}Rp ${t.amount.toLocaleString('id-ID')}
                  </div>
                </div>
              `;
            }
          });
        }
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

    const parent = ctx.parentElement;
    const existingPlaceholder = document.getElementById('cashFlowChartPlaceholder');

    if (transactions.length === 0) {
      ctx.style.display = 'none';
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      if (!existingPlaceholder) {
        const placeholder = document.createElement('div');
        placeholder.id = 'cashFlowChartPlaceholder';
        placeholder.className = 'flex flex-col items-center justify-center text-center p-6';
        placeholder.style.cssText = 'height: 100%; border: 2px dashed var(--border-color); border-radius: var(--radius-lg); background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; align-items: center; justify-content: center;';
        placeholder.innerHTML = `
          <div style="font-size: 3rem; margin-bottom: 8px;">📈</div>
          <h4 style="margin: 0 0 8px 0; color: var(--color-text-primary); font-weight: 700;">Grafik Belum Tersedia</h4>
          <p class="text-secondary text-sm m-0" style="max-width: 280px; font-size: 0.85rem; line-height: 1.4;">Belum ada transaksi. Silakan tambah transaksi pertama Anda untuk melihat statistik grafik cash flow.</p>
        `;
        parent.appendChild(placeholder);
      }
      return;
    } else {
      ctx.style.display = 'block';
      if (existingPlaceholder) {
        existingPlaceholder.remove();
      }
    }

    // Use full current month instead of last 7 days
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build daily data for every day in the current month
    const dailyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let income = 0;
      let expense = 0;
      transactions.forEach(t => {
        if (t.date === dateStr) {
          if (t.type === 'Income') income += t.amount;
          else expense += t.amount;
        }
      });
      dailyData.push({ day, dateStr, income, expense });
    }

    // Cumulative balance line
    let cumulative = 0;
    const cumulativeData = dailyData.map(d => {
      cumulative += d.income - d.expense;
      return cumulative;
    });

    if (this.chart) this.chart.destroy();

    const canvasCtx = ctx.getContext('2d');
    const incomeGradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
    incomeGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    incomeGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const expenseGradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dailyData.map(d => {
          const date = new Date(year, month, d.day);
          return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }),
        datasets: [
          {
            label: 'Pemasukan',
            data: dailyData.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: incomeGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: (ctx) => dailyData[ctx.dataIndex]?.income > 0 ? 5 : 0,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 7
          },
          {
            label: 'Pengeluaran',
            data: dailyData.map(d => d.expense),
            borderColor: '#ef4444',
            backgroundColor: expenseGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: (ctx) => dailyData[ctx.dataIndex]?.expense > 0 ? 5 : 0,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 7
          },
          {
            label: 'Saldo Kumulatif',
            data: cumulativeData,
            borderColor: '#2563eb',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.3,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#2563eb'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#64748b',
              font: { family: 'Inter', size: 12 },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += 'Rp ' + Math.round(context.parsed.y).toLocaleString('id-ID');
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.4)' },
            ticks: { 
              color: '#64748b',
              font: { family: 'Inter' },
              callback: (value) => 'Rp ' + value.toLocaleString('id-ID')
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter' },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 15
            }
          }
        }
      }
    });
  },

  async loadInsightsData() {
    if (!this.user) return;

    // Check setup blockers
    const savingGoal = parseFloat(this.user.savingGoal) || 0;
    const monthlyIncome = parseFloat(this.user.monthlyIncome) || 0;

    const setupBlocker = document.getElementById('insightsEmptyState');
    const insightsContent = document.getElementById('insightsContent');

    if (savingGoal <= 0 || monthlyIncome <= 0) {
      if (setupBlocker) setupBlocker.style.display = 'block';
      if (insightsContent) insightsContent.style.display = 'none';
      return;
    } else {
      if (setupBlocker) setupBlocker.style.display = 'none';
      if (insightsContent) insightsContent.style.display = 'block';
    }

    try {
      const transactions = await api.getTransactions(this.user.id);
      
      const monthSelector = document.getElementById('monthSelector');
      const selectedMonthText = monthSelector ? monthSelector.value : 'Mei 2026';
      
      // Parse month and year from string e.g. "Mei 2026"
      const parts = selectedMonthText.split(' ');
      const monthStr = parts[0].toLowerCase();
      const year = parseInt(parts[1]) || new Date().getFullYear();
      
      const monthsMap = {
        'januari': 0, 'jan': 0, 'january': 0,
        'februari': 1, 'feb': 1, 'february': 1,
        'maret': 2, 'mar': 2, 'march': 2,
        'april': 3, 'apr': 3,
        'mei': 4, 'may': 4,
        'juni': 5, 'jun': 5, 'june': 5,
        'juli': 6, 'jul': 6, 'july': 6,
        'agustus': 7, 'agt': 7, 'august': 7, 'aug': 7,
        'september': 8, 'sep': 8,
        'oktober': 9, 'okt': 9, 'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'desember': 11, 'des': 11, 'december': 11, 'dec': 11
      };
      const month = monthsMap[monthStr] !== undefined ? monthsMap[monthStr] : new Date().getMonth();

      // Filter transactions for the selected month/year
      const filteredTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const tDateParts = t.date.split('-');
        const tYear = parseInt(tDateParts[0]);
        const tMonth = parseInt(tDateParts[1]) - 1;
        return tYear === year && tMonth === month;
      });

      // 1. Render Spending Trends vs Average Line Chart
      this.renderSpendingTrendsChart(transactions, selectedMonthText);
      
      // 2. Render Category Breakdown
      this.renderCategoryBreakdown(filteredTransactions);

      // 3. Get AI Recommendations from backend based on selected month's transactions
      const insightsContainer = document.getElementById('aiInsightsContainer');
      if (insightsContainer) {
        if (filteredTransactions.length === 0) {
          insightsContainer.innerHTML = `
            <div class="insight-card info mb-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="font-bold text-sm">Rekomendasi Pintar</span>
              </div>
              <p class="text-sm text-secondary m-0">Silakan isi transaksi pengeluaran Anda untuk mendapatkan rekomendasi finansial pintar otomatis dari AI.</p>
            </div>
          `;
        } else {
          const res = await api.getInsights(filteredTransactions);
          if (res.insights) {
            insightsContainer.innerHTML = '';
            res.insights.forEach(insight => {
              let badgeColorClass = 'info';
              if (insight.type === 'warning') badgeColorClass = 'warning';
              if (insight.type === 'success') badgeColorClass = 'success';
              
              insightsContainer.innerHTML += `
                <div class="insight-card ${badgeColorClass} mb-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="font-bold text-sm">${insight.title}</span>
                  </div>
                  <p class="text-sm text-secondary m-0">${insight.message}</p>
                </div>
              `;
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  },

  renderSpendingTrendsChart(transactions, selectedMonthText) {
    const ctx = document.getElementById('spendingTrendsChart');
    if (!ctx) return;

    const parent = ctx.parentElement;
    const existingPlaceholder = document.getElementById('spendingTrendsChartPlaceholder');

    // Parse month and year from string e.g. "Mei 2026"
    const parts = selectedMonthText.split(' ');
    const monthStr = parts[0].toLowerCase();
    const year = parseInt(parts[1]) || new Date().getFullYear();
    
    const monthsMap = {
      'januari': 0, 'jan': 0, 'january': 0,
      'februari': 1, 'feb': 1, 'february': 1,
      'maret': 2, 'mar': 2, 'march': 2,
      'april': 3, 'apr': 3,
      'mei': 4, 'may': 4,
      'juni': 5, 'jun': 5, 'june': 5,
      'juli': 6, 'jul': 6, 'july': 6,
      'agustus': 7, 'agt': 7, 'august': 7, 'aug': 7,
      'september': 8, 'sep': 8,
      'oktober': 9, 'okt': 9, 'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'desember': 11, 'des': 11, 'december': 11, 'dec': 11
    };
    const month = monthsMap[monthStr] !== undefined ? monthsMap[monthStr] : new Date().getMonth();

    // Filter to only expenses in the selected month/year
    const monthlyExpenses = transactions.filter(t => {
      if (t.type !== 'Expense' || !t.date) return false;
      const tDateParts = t.date.split('-');
      const tYear = parseInt(tDateParts[0]);
      const tMonth = parseInt(tDateParts[1]) - 1;
      return tYear === year && tMonth === month;
    });

    if (monthlyExpenses.length === 0) {
      ctx.style.display = 'none';
      if (this.spendingChart) {
        this.spendingChart.destroy();
        this.spendingChart = null;
      }
      if (!existingPlaceholder) {
        const placeholder = document.createElement('div');
        placeholder.id = 'spendingTrendsChartPlaceholder';
        placeholder.className = 'flex flex-col items-center justify-center text-center p-6';
        placeholder.style.cssText = 'height: 100%; width: 100%; border: 2px dashed var(--border-color); border-radius: var(--radius-lg); background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; align-items: center; justify-content: center;';
        placeholder.innerHTML = `
          <div style="font-size: 3rem; margin-bottom: 8px;">📊</div>
          <h4 style="margin: 0 0 8px 0; color: var(--color-text-primary); font-weight: 700;">Grafik Tren Belum Tersedia</h4>
          <p class="text-secondary text-sm m-0" style="max-width: 320px; font-size: 0.85rem; line-height: 1.4;">Belum ada transaksi pengeluaran pada bulan ini. Silakan tambah transaksi pengeluaran untuk melihat analisis grafik tren.</p>
        `;
        parent.appendChild(placeholder);
      }
      return;
    } else {
      ctx.style.display = 'block';
      if (existingPlaceholder) {
        existingPlaceholder.remove();
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailySpending = Array(daysInMonth).fill(0);

    transactions.forEach(t => {
      if (t.type === 'Expense') {
        const tDateParts = t.date.split('-');
        const tYear = parseInt(tDateParts[0]);
        const tMonth = parseInt(tDateParts[1]) - 1;
        const tDay = parseInt(tDateParts[2]);

        if (tYear === year && tMonth === month && tDay >= 1 && tDay <= daysInMonth) {
          dailySpending[tDay - 1] += t.amount;
        }
      }
    });

    const totalExpense = dailySpending.reduce((sum, val) => sum + val, 0);
    const averageSpending = totalExpense / daysInMonth;
    const averageData = Array(daysInMonth).fill(averageSpending);

    const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

    if (this.spendingChart) {
      this.spendingChart.destroy();
    }

    const canvasCtx = ctx.getContext('2d');
    const primaryGradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
    primaryGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    primaryGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    this.spendingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Spending',
            data: dailySpending,
            borderColor: '#2563eb',
            borderWidth: 3,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#ffffff',
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#2563eb',
            pointHoverBorderColor: '#ffffff',
            backgroundColor: primaryGradient,
            fill: true,
            tension: 0.35
          },
          {
            label: 'Average Daily',
            data: averageData,
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#64748b',
              font: {
                family: 'Inter',
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += 'Rp ' + Math.round(context.parsed.y).toLocaleString('id-ID');
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(226, 232, 240, 0.4)'
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Inter'
              },
              callback: (value) => 'Rp ' + value.toLocaleString('id-ID')
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Inter'
              }
            }
          }
        }
      }
    });
  },

  renderCategoryBreakdown(filteredTransactions) {
    const container = document.getElementById('categoryBreakdownContainer');
    if (!container) return;

    // Filter to only expenses
    const expenses = filteredTransactions.filter(t => t.type === 'Expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    // Sum by category
    const categories = {};
    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    container.innerHTML = '';

    if (expenses.length === 0) {
      container.innerHTML = '<div class="p-4 text-center text-muted" style="grid-column: 1 / -1;">Tidak ada pengeluaran pada bulan ini.</div>';
      return;
    }

    // Sort categories by amount descending
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

    const barColors = [
      'var(--color-primary)',
      'var(--color-secondary)',
      'var(--color-warning)',
      'var(--color-accent)',
      '#8b5cf6',
      '#ec4899'
    ];

    sortedCategories.forEach(([category, amount], index) => {
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      const color = barColors[index % barColors.length];

      container.innerHTML += `
        <div class="p-4 rounded-lg" style="background: rgba(0,0,0,0.03); border: 1px solid var(--border-color);">
          <div class="text-muted text-sm mb-1">${category}</div>
          <div class="font-bold text-xl">Rp ${amount.toLocaleString('id-ID')}</div>
          <div class="w-full bg-gray-700 mt-2 rounded-full h-1.5 mb-1" style="background: #eff6ff;">
            <div class="h-1.5 rounded-full" style="width: ${percentage}%; background: ${color};"></div>
          </div>
          <div class="text-right text-xs text-muted mt-1">${percentage}% dari total</div>
        </div>
      `;
    });
  },

  async loadHistoryData() {
    if (!this.user) return;

    // Check setup blockers
    const savingGoal = parseFloat(this.user.savingGoal) || 0;
    const monthlyIncome = parseFloat(this.user.monthlyIncome) || 0;

    const setupBlocker = document.getElementById('historyEmptyState');
    const historyContent = document.getElementById('historyContent');

    if (savingGoal <= 0 || monthlyIncome <= 0) {
      if (setupBlocker) setupBlocker.style.display = 'block';
      if (historyContent) historyContent.style.display = 'none';
      return;
    } else {
      if (setupBlocker) setupBlocker.style.display = 'none';
      if (historyContent) historyContent.style.display = 'block';
    }

    try {
      const transactions = await api.getTransactions(this.user.id);
      
      let typeFilter = 'all'; // 'all', 'Income', 'Expense'
      let categoryFilter = 'all';
      let searchQuery = '';

      const listEl = document.getElementById('transactionHistoryList');
      const searchInput = document.getElementById('historySearchInput');
      const categorySelect = document.getElementById('historyCategorySelect');

      const tabAll = document.getElementById('tabAll');
      const tabIncome = document.getElementById('tabIncome');
      const tabExpense = document.getElementById('tabExpense');

      const isMobile = window.location.pathname.includes('/mobile/');

      const render = () => {
        if (!listEl) return;
        listEl.innerHTML = '';

        // Filter transactions
        const filtered = transactions.filter(t => {
          // Type filter
          if (typeFilter !== 'all' && t.type !== typeFilter) return false;

          // Category filter
          if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

          // Search query (category or notes)
          if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const noteMatch = (t.notes || '').toLowerCase().includes(query);
            const categoryMatch = (t.category || '').toLowerCase().includes(query);
            if (!noteMatch && !categoryMatch) return false;
          }

          return true;
        });

        if (filtered.length === 0) {
          listEl.innerHTML = `
            <div class="p-8 text-center text-secondary flex flex-col items-center justify-center animate-fade-in" style="grid-column: 1 / -1; width: 100%;">
              <span style="font-size: 2.5rem; margin-bottom: 8px;">🔍</span>
              <div class="font-bold mb-1" style="color: var(--color-text-primary); font-size: 1rem;">Transaksi Tidak Ditemukan</div>
              <div style="font-size: 0.85rem; color: var(--color-text-muted);">Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.</div>
            </div>
          `;
          return;
        }

        // Sort transactions to show newest first
        filtered.slice().reverse().forEach(t => {
          const isIncome = t.type === 'Income';
          const icon = isIncome ? '💰' : '🛒';
          const amtText = `${isIncome ? '+' : '-'}Rp ${t.amount.toLocaleString('id-ID')}`;
          
          let formattedDate = '-';
          if (t.date) {
            const dateObj = new Date(t.date);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
            } else {
              formattedDate = t.date;
            }
          }

          if (isMobile) {
            listEl.innerHTML += `
              <div class="t-card animate-fade-in">
                <div class="t-icon-box ${isIncome ? 'income' : 'expense'}">
                  ${icon}
                </div>
                <div class="t-info">
                  <div class="t-title">${t.category}</div>
                  <div class="t-note">${t.notes || 'Tanpa catatan'}</div>
                  <div class="t-meta">${formattedDate}</div>
                </div>
                <div class="t-right">
                  <div class="t-val ${isIncome ? 'income' : 'expense'}">${amtText}</div>
                  <span class="badge-type-mobile ${isIncome ? 'badge-income' : 'badge-expense'}">
                    ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </div>
              </div>
            `;
          } else {
            listEl.innerHTML += `
              <div class="history-row animate-fade-in">
                <div>
                  <div class="t-icon ${isIncome ? 'income' : 'expense'}">
                    ${icon}
                  </div>
                </div>
                <div class="t-category">${t.category}</div>
                <div class="t-notes" title="${t.notes || ''}">${t.notes || '-'}</div>
                <div class="t-date">${formattedDate}</div>
                <div>
                  <span class="badge-type ${isIncome ? 'badge-income' : 'badge-expense'}">
                    ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
                  </span>
                </div>
                <div class="t-amount ${isIncome ? 'income' : 'expense'}">${amtText}</div>
              </div>
            `;
          }
        });
      };

      // Bind search
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          render();
        });
      }

      // Bind category
      if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
          categoryFilter = e.target.value;
          render();
        });
      }

      // Bind tabs
      const setTabActive = (activeTab, type) => {
        [tabAll, tabIncome, tabExpense].forEach(tab => {
          if (tab) tab.classList.remove('active');
        });
        if (activeTab) activeTab.classList.add('active');
        typeFilter = type;
        render();
      };

      if (tabAll) {
        tabAll.addEventListener('click', () => setTabActive(tabAll, 'all'));
      }
      if (tabIncome) {
        tabIncome.addEventListener('click', () => setTabActive(tabIncome, 'Income'));
      }
      if (tabExpense) {
        tabExpense.addEventListener('click', () => setTabActive(tabExpense, 'Expense'));
      }

      // Initial render
      render();

    } catch (error) {
      console.error('Failed to load history data:', error);
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
