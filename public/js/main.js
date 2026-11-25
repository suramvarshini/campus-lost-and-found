/**
 * Campus Lost and Found System - Main UI Utilities & Mobile Engine
 * Common UI helpers, mobile navigation, Android back-button, and network monitoring.
 */

// Toast Notifications Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// XSS Prevention Helper
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Format Date for UI Display
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Format Category Title
function formatCategory(cat) {
  if (!cat) return 'Others';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

// Mobile Bottom Navigation Setup & Link Sync
function setupMobileNavigation() {
  const currentPath = window.location.pathname;
  const isIndex = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath === '';
  const isPost = currentPath.includes('post-item');
  const isAdmin = currentPath.includes('admin');

  // Highlight Top Navigation
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if ((isIndex && href.includes('index.html')) ||
        (isPost && href.includes('post-item')) ||
        (isAdmin && href.includes('admin'))) {
      link.classList.add('active');
    }
  });

  // Highlight Bottom Navigation
  const navHome = document.getElementById('bnav-home');
  const navPost = document.getElementById('bnav-post');
  const navAdmin = document.getElementById('bnav-admin');

  if (isIndex && navHome) navHome.classList.add('active');
  if (isPost && navPost) navPost.classList.add('active');
  if (isAdmin && navAdmin) navAdmin.classList.add('active');

  // Admin Bottom Nav Redirect Check (Send to dashboard if logged in, else login)
  if (navAdmin) {
    navAdmin.addEventListener('click', (e) => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        e.preventDefault();
        window.location.href = 'admin-dashboard.html';
      }
    });
  }
}

// Native Android Hardware / Gesture Back Button Navigation
function setupAndroidBackButton() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    const { App } = window.Capacitor.Plugins;
    
    App.addListener('backButton', ({ canGoBack }) => {
      console.log('[Android Back Button] Pressed. canGoBack:', canGoBack);
      
      // 1. If Claim Modal is open, close it
      const claimModal = document.getElementById('claim-modal');
      if (claimModal && claimModal.classList.contains('active')) {
        claimModal.classList.remove('active');
        return;
      }

      // 2. If on sub-pages (detail, post, admin), navigate back to Home
      const currentPath = window.location.pathname;
      const isIndex = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath === '';
      
      if (!isIndex) {
        if (canGoBack) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      } else {
        // Exit app on double back or directly exit on home
        App.exitApp();
      }
    });
  }
}

// Network Status Monitoring & Offline Banner
function setupNetworkMonitoring() {
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    let offlineBanner = document.getElementById('offline-banner');

    if (!isOnline) {
      if (!offlineBanner) {
        offlineBanner = document.createElement('div');
        offlineBanner.id = 'offline-banner';
        offlineBanner.className = 'offline-banner';
        offlineBanner.innerHTML = `
          <span>⚠️ You are currently offline. Please check your internet connection.</span>
          <button id="offline-retry-btn" class="btn btn-outline" style="padding: 2px 10px; font-size: 0.75rem; color: #fff; border-color: #fff;">Retry</button>
        `;
        document.body.prepend(offlineBanner);
        
        document.getElementById('offline-retry-btn')?.addEventListener('click', () => {
          window.location.reload();
        });
      }
      offlineBanner.style.display = 'flex';
    } else if (offlineBanner) {
      offlineBanner.style.display = 'none';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

// Capacitor Native StatusBar & Edge-to-Edge Setup
async function setupNativeStatusBar() {
  if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('StatusBar')) {
    try {
      const { StatusBar } = window.Capacitor.Plugins;
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: 'DARK' });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    } catch (e) {
      console.warn('[StatusBar Plugin]', e.message);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupNativeStatusBar();
  setupMobileNavigation();
  setupAndroidBackButton();
  setupNetworkMonitoring();
});
