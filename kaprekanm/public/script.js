const API_URL = '';

let socket = null;
let currentUser = null;

function connectSocket() {
  socket = io();
  socket.on('kapres-update', (kapres) => {
    renderKapres(kapres);
    updateStats(kapres);
  });
}

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorDiv = document.getElementById('loginError');
  
  if (!username || !password) {
    errorDiv.innerText = 'تکایە ناو و پاسوۆرد بنووسە';
    return;
  }
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data;
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
      connectSocket();
      fetchKapres();
    } else {
      errorDiv.innerText = data.error;
    }
  } catch (err) {
    errorDiv.innerText = 'هەڵەی پەیوەندی';
  }
}

function logout() {
  currentUser = null;
  if (socket) socket.disconnect();
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('mainContainer').style.display = 'none';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

async function fetchKapres() {
  const res = await fetch('/api/kapres');
  const kapres = await res.json();
  renderKapres(kapres);
  updateStats(kapres);
}

function updateStats(kapres) {
  const total = kapres.length;
  const available = kapres.filter(k => k.status === 'بەردەست').length;
  const rented = total - available;
  document.getElementById('totalCount').innerText = total;
  document.getElementById('availableCount').innerText = available;
  document.getElementById('rentedCount').innerText = rented;
}

function renderKapres(kapres) {
  const container = document.getElementById('kapreList');
  container.innerHTML = '';
  kapres.forEach(k => {
    const div = document.createElement('div');
    div.className = 'kapre-item';
    div.innerHTML = `
      <div class="kapre-info">
        <div class="kapre-name">${k.name}</div>
        <div class="kapre-type">${k.type}</div>
        <div class="kapre-price">${k.price.toLocaleString()} دینار/ڕۆژ</div>
        ${k.status === 'گیراو' ? `<div style="font-size:12px;color:#aaa;">📞 ${k.customerName || ''} - ${k.customerPhone || ''}</div>` : ''}
      </div>
      <div>
        <span class="status ${k.status === 'بەردەست' ? 'status-available' : 'status-rented'}">${k.status === 'بەردەست' ? '🟢 بەردەست' : '🔴 گیراو'}</span>
      </div>
      <div>
        ${k.status === 'بەردەست' 
          ? `<button class="action-btn" onclick="openRentModal('${k._id}', '${k.name}')">📝</button>` 
          : `<button class="action-btn" onclick="returnKapre('${k._id}')">🔄</button>`}
      </div>
    `;
    container.appendChild(div);
  });
}

function openAddModal() {
  document.getElementById('addModal').style.display = 'flex';
  document.getElementById('kapreName').value = '';
  document.getElementById('addError').innerText = '';
}

function closeAddModal() {
  document.getElementById('addModal').style.display = 'none';
}

async function addKapre() {
  const name = document.getElementById('kapreName').value.trim().toUpperCase();
  const type = document.getElementById('kapreType').value;
  const errorDiv = document.getElementById('addError');
  
  if (!name) {
    errorDiv.innerText = 'تکایە ناوی کەپر بنووسە';
    return;
  }
  
  try {
    const res = await fetch('/api/kapres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type })
    });
    if (res.ok) {
      closeAddModal();
      fetchKapres();
    } else {
      const err = await res.json();
      errorDiv.innerText = err.error;
    }
  } catch (err) {
    errorDiv.innerText = 'هەڵەی پەیوەندی';
  }
}

let currentRentKapreId = null;
function openRentModal(kapreId, kapreName) {
  currentRentKapreId = kapreId;
  document.getElementById('rentKapreInfo').innerHTML = `<strong>کەپر: ${kapreName}</strong>`;
  document.getElementById('customerName').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('rentError').innerText = '';
  document.getElementById('rentModal').style.display = 'flex';
}

function closeRentModal() {
  document.getElementById('rentModal').style.display = 'none';
  currentRentKapreId = null;
}

async function confirmRent() {
  const customerName = document.getElementById('customerName').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const errorDiv = document.getElementById('rentError');
  
  if (!customerName || !customerPhone) {
    errorDiv.innerText = 'تکایە ناو و ژمارەی مۆبایل بنووسە';
    return;
  }
  
  try {
    const res = await fetch('/api/rent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kapreId: currentRentKapreId, customerName, customerPhone })
    });
    if (res.ok) {
      closeRentModal();
      fetchKapres();
    } else {
      const err = await res.json();
      errorDiv.innerText = err.error;
    }
  } catch (err) {
    errorDiv.innerText = 'هەڵەی پەیوەندی';
  }
}

async function returnKapre(kapreId) {
  if (!confirm('دڵنیای لە گەڕاندنەوەی کەپرەکە؟')) return;
  try {
    await fetch('/api/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kapreId })
    });
    fetchKapres();
  } catch (err) {
    alert('هەڵەیەک ڕوویدا');
  }
}