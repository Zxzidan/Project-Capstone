const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Database paths
const TRANSACTIONS_FILE = path.join(__dirname, 'data', 'transactions.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Initialize empty JSON files if they don't exist
const initializeDB = () => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
};
initializeDB();

// Helper functions
const readData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ==========================================
// AUTHENTICATION API
// ==========================================
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  const users = readData(USERS_FILE);
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = { id: Date.now().toString(), email, password, name: name || 'User' };
  users.push(newUser);
  writeData(USERS_FILE, users);

  // Exclude password from response
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ message: 'User created successfully', user: userWithoutPassword });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = readData(USERS_FILE);
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ message: 'Login successful', user: userWithoutPassword });
});

// ==========================================
// TRANSACTIONS API
// ==========================================
app.get('/api/transactions', (req, res) => {
  const userId = req.query.userId;
  const transactions = readData(TRANSACTIONS_FILE);
  
  if (userId) {
    res.json(transactions.filter(t => t.userId === userId));
  } else {
    res.json(transactions);
  }
});

app.post('/api/transactions', (req, res) => {
  const { userId, amount, type, category, date, notes } = req.body;
  if (!userId || !amount || !type || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const transactions = readData(TRANSACTIONS_FILE);
  const newTransaction = {
    id: Date.now().toString(),
    userId,
    amount: parseFloat(amount),
    type,
    category,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  transactions.push(newTransaction);
  writeData(TRANSACTIONS_FILE, transactions);
  res.status(201).json(newTransaction);
});

// ==========================================
// AI INSIGHTS API
// ==========================================
app.post('/api/insights', async (req, res) => {
  const { transactions } = req.body;
  
  if (!transactions || transactions.length === 0) {
    return res.json({
      insights: [
        { type: 'info', title: 'Belum Ada Data', message: 'Tambahkan transaksi untuk mendapatkan analisis AI.' }
      ]
    });
  }

  // Calculate some basic stats to pass to AI or use in mock
  const expenses = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
  const income = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);

  // If we had a real GEMINI API key set in env:
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Since user said they don't have an API key, we will simulate an AI response 
  // based on the actual transactions sent to the backend.
  setTimeout(() => {
    const insights = [];
    
    if (expenses > income && income > 0) {
      insights.push({ type: 'warning', title: '⚠️ Pengeluaran Melebihi Pendapatan', message: `Pengeluaran Anda ($${expenses}) lebih besar dari pendapatan ($${income}). Coba kurangi pengeluaran tidak penting.` });
    } else if (income > expenses && expenses > 0) {
      insights.push({ type: 'success', title: '✅ Keuangan Sehat', message: `Bagus! Anda berhasil menabung $${(income - expenses).toFixed(2)} sejauh ini.` });
    }

    // Category analysis
    const categories = {};
    transactions.filter(t => t.type === 'Expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const sortedCats = Object.keys(categories).sort((a, b) => categories[b] - categories[a]);
    if (sortedCats.length > 0) {
      insights.push({ type: 'info', title: '🤖 Kategori Terbesar', message: `Kategori pengeluaran terbesar Anda adalah ${sortedCats[0]} sebesar $${categories[sortedCats[0]].toFixed(2)}.` });
    } else {
      insights.push({ type: 'info', title: '🤖 Analisis AI', message: `Pengeluaran Anda tercatat dengan baik, pertahankan kebiasaan mencatat!` });
    }

    res.json({ insights });
  }, 1000); // Simulate network/AI delay
});

app.listen(PORT, () => {
  console.log(`Backend Server is running on http://localhost:${PORT}`);
});
