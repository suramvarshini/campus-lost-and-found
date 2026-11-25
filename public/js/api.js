/**
 * Campus Lost and Found System - API Communication Module
 * Connects directly to deployed Render backend (or local development backend).
 */

const RENDER_ORIGIN = 'https://campus-lost-and-found-k68p.onrender.com';

// Detect runtime environment:
// 1. Android Capacitor WebView uses 'capacitor:' or 'https://localhost' or 'http://localhost'
// 2. Direct browser opening uses 'file:'
// 3. Deployed website on Render uses window.location.origin (which contains 'onrender.com')
// 4. Local Node.js development server runs on port 3000
function getApiOrigin() {
  if (typeof window === 'undefined') return RENDER_ORIGIN;
  
  // If hosted on Render production website
  if (window.location.origin && window.location.origin.includes('onrender.com')) {
    return window.location.origin;
  }
  
  // If running in Capacitor Android App, Cordova, or opened directly as file://
  if (
    window.Capacitor !== undefined ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && window.location.port !== '3000')
  ) {
    return RENDER_ORIGIN;
  }

  // Local development with server running on port 3000
  if (window.location.port === '3000') {
    return 'http://localhost:3000';
  }

  // Default to Render production backend
  return RENDER_ORIGIN;
}

const API_ORIGIN = getApiOrigin();
const API_BASE = `${API_ORIGIN}/api`;

console.log('[API] Initialized with backend origin:', API_ORIGIN);

// Resilient Fetch with Timeout and Render Spin-Up Retry Handling
async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 35000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (attempt > 0) {
        showServerWakingIndicator(true);
      }
      
      const fetchOptions = {
        cache: 'no-store',
        ...options,
        signal: controller.signal
      };

      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      showServerWakingIndicator(false);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[API] Request attempt ${attempt + 1} failed:`, err.message);
      
      if (attempt < retries) {
        showServerWakingIndicator(true);
        // Wait 3.5 seconds before retrying to give Render free-tier container time to boot
        await new Promise(r => setTimeout(r, 3500));
      } else {
        showServerWakingIndicator(false);
        throw err;
      }
    }
  }
}

function showServerWakingIndicator(show) {
  let indicator = document.getElementById('server-waking-pill');
  if (!indicator && show) {
    indicator = document.createElement('div');
    indicator.id = 'server-waking-pill';
    indicator.className = 'server-waking-pill';
    indicator.innerHTML = '<span>⏳</span> <span>Connecting to campus server (waking up instance)...</span>';
    document.body.appendChild(indicator);
  } else if (indicator) {
    indicator.style.display = show ? 'flex' : 'none';
  }
}

const API = {
  ORIGIN: API_ORIGIN,
  BASE: API_BASE,

  /**
   * Resolve item image URL so local/relative paths point to Render backend
   */
  resolveImageUrl(url) {
    if (!url || url === '/uploads/default-item.png') {
      return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&auto=format&fit=crop&q=60';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const clean = url.startsWith('/') ? url : `/${url}`;
    return `${API_ORIGIN}${clean}`;
  },

  /**
   * Health status check
   */
  async checkHealth() {
    try {
      const res = await fetchWithRetry(`${API_BASE}/health`, { method: 'GET' }, 1, 10000);
      return await res.json();
    } catch (e) {
      return { status: 'offline', error: e.message };
    }
  },

  /**
   * Fetch lost and found items with optional query parameters
   */
  async getItems(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    params.append('_t', Date.now().toString()); // Cache buster to ensure real-time records

    const res = await fetchWithRetry(`${API_BASE}/items?${params.toString()}`);
    return await res.json();
  },

  /**
   * Fetch single item detail by ID
   */
  async getItemById(id) {
    const res = await fetchWithRetry(`${API_BASE}/items/${id}`);
    return await res.json();
  },

  /**
   * Submit new lost or found item (FormData for file upload)
   */
  async createItem(formData) {
    const res = await fetchWithRetry(`${API_BASE}/items`, {
      method: 'POST',
      body: formData // Content-Type header auto-set by browser for FormData
    });
    return await res.json();
  },

  /**
   * Request category auto-classification for real-time form feedback
   */
  async classifyText(title, description) {
    const res = await fetchWithRetry(`${API_BASE}/items/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    return await res.json();
  },

  /**
   * Submit claim request for an item
   */
  async createClaim(formData) {
    const res = await fetchWithRetry(`${API_BASE}/claims`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },

  /**
   * Admin Login
   */
  async loginAdmin(email, password) {
    const res = await fetchWithRetry(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await res.json();
  },

  /**
   * Admin: Get all claim requests
   */
  async getClaims(token, status = 'all') {
    const res = await fetchWithRetry(`${API_BASE}/claims?status=${status}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  /**
   * Admin: Verify (Approve/Reject) claim request
   */
  async verifyClaim(token, claimId, status, adminNotes) {
    const res = await fetchWithRetry(`${API_BASE}/claims/${claimId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, adminNotes })
    });
    return await res.json();
  },

  /**
   * Admin: Delete item post
   */
  async deleteItem(token, itemId) {
    const res = await fetchWithRetry(`${API_BASE}/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  },

  /**
   * Admin: Update item status manually
   */
  async updateItemStatus(token, itemId, status) {
    const res = await fetchWithRetry(`${API_BASE}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    return await res.json();
  }
};
