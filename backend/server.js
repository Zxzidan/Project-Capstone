const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Connect MongoDB — dengan caching agar tidak reconnect tiap request
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

// ==========================================
// SCHEMAS
// ==========================================
const userSchema = new mongoose.Schema({
  id: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String,
  name: String,
  onboarded: Boolean
}, { strict: false });

const transactionSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  type: String,
  category: String,
  date: String,
  notes: String,
  createdAt: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// ==========================================
// MIDDLEWARE: connect DB sebelum tiap request
// ==========================================
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ==========================================
// AUTHENTICATION API
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, username, password, ...profileData } = req.body;
    if (!email || !password || !username)
      return res.status(400).json({ error: 'Email, username, and password required' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing)
      return res.status(400).json({ error: 'Email atau Username ini sudah terdaftar.' });

    const newUser = new User({
      id: Date.now().toString(),
      email, username, password,
      name: profileData.name || username,
      ...profileData,
      onboarded: true
    });
    await newUser.save();

    const { password: _, ...userWithoutPassword } = newUser.toObject();
    res.status(201).json({ message: 'User created successfully', user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ $or: [{ email }, { username: email }] });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password !== password)
      return res.status(401).json({ error: 'Invalid password' });

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({ message: 'Login successful', user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const user = await User.findOneAndUpdate(
      { id: userId },
      { ...profileData, onboarded: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({ message: 'Profile updated', user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TRANSACTIONS API
// ==========================================
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};
    const transactions = await Transaction.find(filter);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, amount, type, category, date, notes } = req.body;
    if (!userId || !amount || !type || !category)
      return res.status(400).json({ error: 'Missing required fields' });

    const newTransaction = new Transaction({
      userId, amount: parseFloat(amount), type, category,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || '',
      createdAt: new Date().toISOString()
    });
    await newTransaction.save();
    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AI INSIGHTS API
// ==========================================
app.post('/api/insights', async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!transactions || transactions.length === 0) {
      return res.json({ insights: [{ type: 'info', title: 'Belum Ada Data', message: 'Tambahkan transaksi untuk mendapatkan analisis AI.' }] });
    }

    const expenses = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    const income = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);

    const insights = [];
    if (expenses > income && income > 0) {
      insights.push({ type: 'warning', title: '⚠️ Pengeluaran Melebihi Pendapatan', message: `Pengeluaran Anda lebih besar dari pendapatan. Coba kurangi pengeluaran tidak penting.` });
    } else if (income > expenses && expenses > 0) {
      insights.push({ type: 'success', title: '✅ Keuangan Sehat', message: `Bagus! Anda berhasil menabung Rp${(income - expenses).toFixed(2)}.` });
    }

    const categories = {};
    transactions.filter(t => t.type === 'Expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    const sortedCats = Object.keys(categories).sort((a, b) => categories[b] - categories[a]);
    if (sortedCats.length > 0) {
      insights.push({ type: 'info', title: '🤖 Kategori Terbesar', message: `Kategori pengeluaran terbesar Anda adalah ${sortedCats[0]}.` });
    }

    res.json({ insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LOCAL DEV vs VERCEL
// ==========================================
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;