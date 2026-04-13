const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaprekanm';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err));

// ========== Models ==========
const KapreSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  type: { type: String, enum: ['بچوک', 'گەورە', 'زۆر گەورە'], required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['بەردەست', 'گیراو'], default: 'بەردەست' },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  rentDate: { type: Date, default: null }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' }
});

const Kapre = mongoose.model('Kapre', KapreSchema);
const User = mongoose.model('User', UserSchema);

// ========== Initialize Default Data ==========
async function initData() {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({ username: 'admin', password: '123456', role: 'admin' });
    console.log('👤 Admin created: admin / 123456');
  }

  const count = await Kapre.countDocuments();
  if (count === 0) {
    const sampleKapres = [
      { name: 'A-01', type: 'بچوک', price: 35000 },
      { name: 'A-02', type: 'بچوک', price: 35000 },
      { name: 'A-03', type: 'بچوک', price: 35000 },
      { name: 'B-01', type: 'گەورە', price: 50000 },
      { name: 'B-02', type: 'گەورە', price: 50000 },
      { name: 'C-01', type: 'زۆر گەورە', price: 75000 }
    ];
    await Kapre.insertMany(sampleKapres);
    console.log('🏕️ Sample kapres created');
  }
}
initData();

// ========== API Routes ==========
app.get('/api/kapres', async (req, res) => {
  const kapres = await Kapre.find();
  res.json(kapres);
});

app.post('/api/kapres', async (req, res) => {
  const { name, type } = req.body;
  let price = 35000;
  if (type === 'گەورە') price = 50000;
  if (type === 'زۆر گەورە') price = 75000;
  
  const existing = await Kapre.findOne({ name });
  if (existing) return res.status(400).json({ error: 'کەپرەکە هەیە' });
  
  const kapre = new Kapre({ name, type, price });
  await kapre.save();
  
  const allKapres = await Kapre.find();
  io.emit('kapres-update', allKapres);
  res.json(kapre);
});

app.post('/api/rent', async (req, res) => {
  const { kapreId, customerName, customerPhone } = req.body;
  const kapre = await Kapre.findById(kapreId);
  if (!kapre) return res.status(404).json({ error: 'کەپر نەدۆزرایەوە' });
  if (kapre.status === 'گیراو') return res.status(400).json({ error: 'کەپرەکە گیراوە' });
  
  kapre.status = 'گیراو';
  kapre.customerName = customerName;
  kapre.customerPhone = customerPhone;
  kapre.rentDate = new Date();
  await kapre.save();
  
  const allKapres = await Kapre.find();
  io.emit('kapres-update', allKapres);
  res.json(kapre);
});

app.post('/api/return', async (req, res) => {
  const { kapreId } = req.body;
  const kapre = await Kapre.findById(kapreId);
  if (!kapre) return res.status(404).json({ error: 'کەپر نەدۆزرایەوە' });
  
  kapre.status = 'بەردەست';
  kapre.customerName = '';
  kapre.customerPhone = '';
  kapre.rentDate = null;
  await kapre.save();
  
  const allKapres = await Kapre.find();
  io.emit('kapres-update', allKapres);
  res.json(kapre);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({ success: true, username: user.username, role: user.role });
  } else {
    res.status(401).json({ success: false, error: 'ناو یان پاسوۆرد هەڵەیە' });
  }
});

io.on('connection', (socket) => {
  console.log('🟢 New client connected');
  socket.on('disconnect', () => console.log('🔴 Client disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));