# Shonra Admin Backend

Modern admin panel for Shopee affiliate product management with React frontend and Express backend.

## 🚀 Features

- **Modern UI**: Built with React, TypeScript, and Lumina design system
- **Backend API**: Express.js with MySQL database
- **Authentication**: Session-based authentication system
- **Product Management**: Search, save, and manage Shopee products
- **Admin Panel**: User management and dashboard statistics
- **API Integration**: Shopee Affiliate API integration

## 📋 Prerequisites

- Node.js (v18 or higher)
- MySQL database
- npm or yarn package manager

## 🛠️ Installation

1. **Install dependencies**

```bash
npm install
```

2. **Setup environment variables**

   - Update `.env` file with your database credentials
   - Add your Shopee API credentials

3. **Setup database**
   - Create a MySQL database named `shopee_affiliate`
   - The application will auto-create tables on first run

## 🏃‍♂️ Running the Application

### Development Mode (Recommended)

```bash
# Run both frontend and backend concurrently
npm run dev
```

This will start:

- **Frontend (Vite)**: http://localhost:5173
- **Backend (Express)**: http://localhost:3001
