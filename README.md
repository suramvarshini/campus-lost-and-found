# 🔍 Campus Lost and Found System

A full-stack web application designed for universities and colleges to report, manage, track, and reclaim lost personal belongings across campus.

---

## 🌟 Key Features

### 1. 📢 Report Lost or Found Items
- Upload item photographs with descriptions, location found/lost, contact details, and dates.
- Automated NLP Keyword Classifier extracts suggested categories and hashtags automatically.

### 2. 🔍 Real-Time Search & Filtering
- Filter items by Category (Electronics, Documents, Bags, Accessories, Others).
- Filter by Type (Lost / Found), Status (Active / Claimed), and Date Ranges.
- Live keyword search across titles, descriptions, and auto-generated tags.

### 3. ✋ Claim Verification Workflow
- Students submit item claims with proof of ownership descriptions and supporting documents/images.
- Prevents false claims through administrator verification.

### 4. 🛡️ Administrator Portal & Moderation Console
- Secure administrative login (`admin@campus.edu` / `admin123`).
- Review, approve, or reject pending ownership claims with admin review notes.
- Moderate, update statuses, or delete item listings.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+
- Local MongoDB daemon OR run zero-config (automatically falls back to `mongodb-memory-server`).

### 2. Installation
```bash
npm install
```

### 3. Database Seeding (Optional)
Populate the database with sample items and the default admin user:
```bash
npm run seed
```

### 4. Start Server
```bash
npm start
```
- **Web App**: http://localhost:3000
- **Report Item**: http://localhost:3000/post-item.html
- **Admin Portal**: http://localhost:3000/admin-login.html (Credentials: `admin@campus.edu` / `admin123`)
- **Health Check**: http://localhost:3000/api/health
