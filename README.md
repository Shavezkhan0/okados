# 🍽️ Okados - Complete Food Delivery Platform

<div align="center">

![Okados Logo](https://via.placeholder.com/150x150.png?text=Okados)

**A modern, scalable, and feature-rich food delivery platform built with cutting-edge technologies**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)

[Features](#-features) • [Demo](#-demo) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Demo](#-demo)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 About

**Okados** is a comprehensive, production-ready food delivery platform that connects hungry customers with their favorite restaurants. Built with modern technologies and best practices, Okados provides a seamless experience for customers, restaurant owners, and administrators.

### Why Okados?

- 🚀 **Production-Ready**: Built with scalability and performance in mind
- 💎 **Modern Stack**: Uses latest technologies (Node.js, React, Flutter, MongoDB)
- 🔒 **Secure**: Implements industry-standard security practices
- ⚡ **Real-time**: Live order tracking and updates via WebSocket
- 📱 **Multi-Platform**: Web, iOS, and Android support
- 🎨 **Beautiful UI**: Intuitive and responsive design
- 🔧 **Maintainable**: Clean code architecture with comprehensive documentation

---

## ✨ Features

### 👥 For Customers

- 🔍 **Smart Search**: Find restaurants by name, cuisine, or location
- 📍 **Location-Based**: Discover nearby restaurants with accurate delivery estimates
- 🛒 **Easy Ordering**: Intuitive cart with product customizations
- 💳 **Multiple Payment Options**: Credit/Debit cards, UPI, Wallets, Cash on Delivery
- 📱 **Real-time Tracking**: Track your order from kitchen to doorstep
- ⭐ **Reviews & Ratings**: Rate your experience and help others decide
- 🎫 **Coupons & Offers**: Save money with exclusive deals
- 📜 **Order History**: Access all your past orders instantly
- 🔔 **Push Notifications**: Get updates on order status
- ❤️ **Favorites**: Save your favorite restaurants for quick access

### 🏪 For Restaurants

- 📊 **Dashboard**: Comprehensive analytics and insights
- 🍕 **Menu Management**: Easy product creation with images and customizations
- 📦 **Order Management**: Accept, prepare, and track orders in real-time
- 💰 **Earnings Reports**: Detailed revenue tracking and payout management
- 🔔 **Instant Notifications**: Get notified immediately when orders arrive
- ⏰ **Schedule Management**: Set opening hours and working days
- 🎯 **Availability Control**: Toggle restaurant and product availability
- 📱 **Mobile & Web Access**: Manage from anywhere
- 📈 **Performance Analytics**: Track orders, ratings, and customer feedback
- 🏦 **Bank Integration**: Secure payout processing

### 👨‍💼 For Administrators

- 📊 **Powerful Dashboard**: Platform-wide analytics and metrics
- 👥 **User Management**: Manage customers and restaurant owners
- 🏪 **Restaurant Approval**: Review and approve new restaurant applications
- 📦 **Order Monitoring**: Oversee all platform orders
- 🎫 **Coupon Management**: Create and manage promotional campaigns
- 🎨 **Banner Management**: Control homepage promotional banners
- 💰 **Revenue Analytics**: Track platform earnings and commissions
- 📈 **Growth Metrics**: Monitor user and restaurant growth
- 🔍 **Review Moderation**: Approve and manage customer reviews
- ⚙️ **System Configuration**: Platform-wide settings and controls

### 🔧 Technical Features

- ⚡ **Real-time Updates**: Socket.io for instant order updates
- 🔐 **JWT Authentication**: Secure token-based authentication
- 📧 **Email Notifications**: Automated email for orders and updates
- 📱 **SMS Alerts**: OTP verification and order notifications
- 🔔 **Push Notifications**: Firebase Cloud Messaging integration
- 💳 **Payment Gateway**: Razorpay integration for secure payments
- 🖼️ **Image Management**: Cloudinary for optimized image storage
- 🗺️ **Geolocation**: Google Maps integration for location services
- 📦 **Caching**: Redis for improved performance
- 🔍 **Search**: Full-text search with MongoDB
- 📊 **Analytics**: Comprehensive reporting and insights
- 🔄 **State Management**: Redux/Riverpod for predictable state
- 🎨 **Responsive Design**: Works on all screen sizes
- ♿ **Accessibility**: WCAG compliant
- 🌐 **i18n Ready**: Multi-language support structure

---

## 🎬 Demo

### Live Demo

🔗 **Coming Soon**

<!-- Uncomment when deployed
- **Customer App**: [https://okados.com](https://okados.com)
- **Restaurant Panel**: [https://restaurant.okados.com](https://restaurant.okados.com)
- **Admin Dashboard**: [https://admin.okados.com](https://admin.okados.com)

### Demo Credentials
**Customer Account:**
- Email: demo@customer.com
- Password: Demo@123

**Restaurant Account:**
- Email: demo@restaurant.com
- Password: Demo@123

**Admin Account:**
- Email: demo@admin.com
- Password: Demo@123
-->

---

## 📸 Screenshots

<div align="center">

### Customer App

<table>
  <tr>
    <td><img src="https://via.placeholder.com/250x500.png?text=Home+Screen" alt="Home Screen" width="250"/></td>
    <td><img src="https://via.placeholder.com/250x500.png?text=Restaurant+Menu" alt="Menu" width="250"/></td>
    <td><img src="https://via.placeholder.com/250x500.png?text=Order+Tracking" alt="Tracking" width="250"/></td>
  </tr>
  <tr>
    <td align="center"><b>Home Screen</b></td>
    <td align="center"><b>Restaurant Menu</b></td>
    <td align="center"><b>Order Tracking</b></td>
  </tr>
</table>

### Restaurant Panel

<table>
  <tr>
    <td><img src="https://via.placeholder.com/400x300.png?text=Dashboard" alt="Dashboard" width="400"/></td>
    <td><img src="https://via.placeholder.com/400x300.png?text=Orders" alt="Orders" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>Dashboard</b></td>
    <td align="center"><b>Order Management</b></td>
  </tr>
</table>

### Admin Dashboard

<table>
  <tr>
    <td><img src="https://via.placeholder.com/400x300.png?text=Analytics" alt="Analytics" width="400"/></td>
    <td><img src="https://via.placeholder.com/400x300.png?text=Users" alt="Users" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>Analytics</b></td>
    <td align="center"><b>User Management</b></td>
  </tr>
</table>

</div>

---

## 🛠️ Tech Stack

### Backend

| Technology                                                                                 | Purpose                 | Version |
| ------------------------------------------------------------------------------------------ | ----------------------- | ------- |
| ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)       | Runtime Environment     | 18+     |
| ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)       | Web Framework           | 4.18+   |
| ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)       | Database                | 6.0+    |
| ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) | Real-time Communication | 4.6+    |
| ![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)             | Caching                 | 4.6+    |
| ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)         | Authentication          | -       |

### Frontend Web (Restaurant & Admin)

| Technology                                                                                       | Purpose          | Version |
| ------------------------------------------------------------------------------------------------ | ---------------- | ------- |
| ![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)             | React Framework  | 14+     |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)    | Type Safety      | 5+      |
| ![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white)   | Styling          | 3+      |
| ![React Query](https://img.shields.io/badge/React_Query-FF4154?logo=react-query&logoColor=white) | Data Fetching    | 5+      |
| ![Zustand](https://img.shields.io/badge/Zustand-000000?logo=react&logoColor=white)               | State Management | -       |

### Mobile Apps (Customer & Restaurant)

| Technology                                                                             | Purpose              | Version |
| -------------------------------------------------------------------------------------- | -------------------- | ------- |
| ![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)   | Mobile Framework     | 3+      |
| ![Dart](https://img.shields.io/badge/Dart-0175C2?logo=dart&logoColor=white)            | Programming Language | 3+      |
| ![Riverpod](https://img.shields.io/badge/Riverpod-02569B?logo=flutter&logoColor=white) | State Management     | 2+      |

### Cloud & DevOps

| Service                                                                                                   | Purpose            |
| --------------------------------------------------------------------------------------------------------- | ------------------ |
| ![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?logo=mongodb&logoColor=white)          | Database Hosting   |
| ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white)             | Image Storage      |
| ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)                   | Push Notifications |
| ![Razorpay](https://img.shields.io/badge/Razorpay-0C2451?logo=razorpay&logoColor=white)                   | Payment Gateway    |
| ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white) | CI/CD              |
| ![Nginx](https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white)                            | Reverse Proxy      |
| ![PM2](https://img.shields.io/badge/PM2-2B037A?logo=pm2&logoColor=white)                                  | Process Manager    |

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ Customer App│ Restaurant  │ Restaurant  │ Admin Dashboard  │
│  (Flutter)  │ Mobile App  │ Web Panel   │   (Next.js)      │
│             │  (Flutter)  │  (Next.js)  │                  │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴─────────────┴───────────────┘
                     │
          ┌──────────▼──────────┐
          │   API Gateway       │
          │   (Nginx/Kong)      │
          └──────────┬──────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
   ┌───▼───┐    ┌───▼───┐    ┌───▼───┐
   │ Auth  │    │Backend│    │Socket │
   │Service│    │  API  │    │Server │
   └───┬───┘    └───┬───┘    └───┬───┘
       │            │            │
       └────────────┼────────────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
   │MongoDB│   │ Redis │   │Firebase│
   │ Atlas │   │ Cache │   │  FCM   │
   └───────┘   └───────┘   └────────┘
```

### Database Schema

**Collections:**

- `users` - Customer, restaurant owner, and admin accounts
- `restaurants` - Restaurant profiles and settings
- `products` - Menu items with customizations
- `orders` - Order details and tracking
- `coupons` - Discount codes and campaigns
- `reviews` - Customer ratings and feedback
- `notifications` - In-app notifications
- `banners` - Promotional banners
- `analytics` - Platform metrics

### API Architecture

**RESTful API** with the following structure:

```
/api/v1
  ├── /auth          - Authentication endpoints
  ├── /users         - User management
  ├── /restaurants   - Restaurant operations
  ├── /products      - Menu management
  ├── /orders        - Order processing
  ├── /payments      - Payment handling
  ├── /coupons       - Coupon management
  ├── /reviews       - Review system
  ├── /notifications - Notification handling
  ├── /upload        - File uploads
  └── /admin         - Admin operations
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **pnpm** (v8 or higher) - `npm install -g pnpm`
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Redis** (v7 or higher) - [Download](https://redis.io/download) (Optional but recommended)
- **Flutter** (v3 or higher) - [Install](https://docs.flutter.dev/get-started/install)
- **Git** - [Download](https://git-scm.com/downloads)

**Optional but Recommended:**

- **Docker** - [Install](https://docs.docker.com/get-docker/)
- **VS Code** - [Download](https://code.visualstudio.com/)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/okados.git
cd okados
```

#### 2. Install Dependencies

```bash
# Install root dependencies
pnpm install

# This will automatically install dependencies for all workspaces
```

#### 3. Environment Configuration

**Backend Configuration:**

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/okados
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/okados

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate using: openssl rand -base64 32)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Cloudinary (Sign up at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay (Sign up at razorpay.com)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Firebase (Create project at firebase.google.com)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Gateway (optional)
SMS_API_KEY=your_sms_api_key

# URLs
CLIENT_URLS=http://localhost:3000,http://localhost:3001
```

**Frontend Configuration:**

```bash
# Restaurant Panel
cd apps/restaurant-panel
cp .env.local.example .env.local

# Admin Dashboard
cd ../admin-dashboard
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

#### 4. Start Services

**Option A: Start All Services**

```bash
# From root directory
pnpm dev
```

This will start:

- Backend API (http://localhost:5000)
- Restaurant Panel (http://localhost:3000)
- Admin Dashboard (http://localhost:3001)

**Option B: Start Individual Services**

```bash
# Backend only
pnpm backend:dev

# Restaurant Panel only
pnpm restaurant:dev

# Admin Dashboard only
pnpm admin:dev

# Flutter User App
cd apps/user-app
flutter run -d chrome  # For web
flutter run           # For mobile (select device)

# Flutter Restaurant App
cd apps/restaurant-app
flutter run
```

#### 5. Verify Installation

**Backend Health Check:**

```bash
curl http://localhost:5000/health
# Expected: {"status":"ok"}
```

**Open in Browser:**

- Restaurant Panel: http://localhost:3000
- Admin Dashboard: http://localhost:3001
- API Docs: http://localhost:5000/api/docs

---

## 📁 Project Structure

```
okados/
├── apps/
│   ├── backend/                    # Node.js + Express API
│   │   ├── src/
│   │   │   ├── config/            # Configuration files
│   │   │   ├── controllers/       # Route controllers
│   │   │   ├── models/            # Mongoose models
│   │   │   ├── routes/            # API routes
│   │   │   ├── middlewares/       # Custom middleware
│   │   │   ├── services/          # Business logic
│   │   │   ├── utils/             # Helper functions
│   │   │   ├── validators/        # Input validation
│   │   │   ├── sockets/           # Socket.io handlers
│   │   │   └── jobs/              # Background jobs
│   │   ├── tests/                 # Test files
│   │   ├── logs/                  # Application logs
│   │   └── package.json
│   │
│   ├── user-app/                   # Flutter Customer App
│   │   ├── lib/
│   │   │   ├── core/              # Core utilities
│   │   │   ├── data/              # Data layer
│   │   │   │   ├── models/
│   │   │   │   ├── providers/
│   │   │   │   ├── repositories/
│   │   │   │   └── services/
│   │   │   └── presentation/      # UI layer
│   │   │       ├── screens/
│   │   │       └── widgets/
│   │   ├── assets/
│   │   └── pubspec.yaml
│   │
│   ├── restaurant-app/             # Flutter Restaurant App
│   │   └── [Similar structure to user-app]
│   │
│   ├── restaurant-panel/           # Next.js Restaurant Panel
│   │   ├── src/
│   │   │   ├── app/               # App router pages
│   │   │   ├── components/        # React components
│   │   │   │   ├── ui/           # Reusable UI components
│   │   │   │   ├── layout/       # Layout components
│   │   │   │   └── features/     # Feature components
│   │   │   ├── lib/               # Libraries
│   │   │   │   ├── api/          # API client
│   │   │   │   ├── hooks/        # Custom hooks
│   │   │   │   ├── stores/       # State management
│   │   │   │   └── utils/        # Utilities
│   │   │   └── types/             # TypeScript types
│   │   ├── public/
│   │   └── package.json
│   │
│   └── admin-dashboard/            # Next.js Admin Dashboard
│       └── [Similar structure to restaurant-panel]
│
├── packages/
│   ├── shared-types/               # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── user.types.ts
│   │   │   ├── restaurant.types.ts
│   │   │   ├── order.types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── api-client/                 # Shared API client
│       ├── src/
│       └── package.json
│
├── docs/                           # Documentation
│   ├── api/                        # API documentation
│   ├── architecture/               # Architecture diagrams
│   └── deployment/                 # Deployment guides
│
├── scripts/                        # Utility scripts
│   ├── setup.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── .github/                        # GitHub configuration
│   └── workflows/                  # CI/CD workflows
│
├── pnpm-workspace.yaml            # pnpm workspace config
├── package.json                    # Root package.json
├── .gitignore
└── README.md
```

---

## 📚 API Documentation

### Authentication

All API requests except public endpoints require authentication using JWT tokens.

**Authentication Header:**

```
Authorization: Bearer <your_jwt_token>
```

### Base URL

```
http://localhost:5000/api/v1
```

### Key Endpoints

#### Auth Endpoints

```http
POST   /auth/register          # Register new user
POST   /auth/login             # Login user
POST   /auth/refresh-token     # Refresh access token
POST   /auth/logout            # Logout user
POST   /auth/forgot-password   # Request password reset
POST   /auth/reset-password    # Reset password
GET    /auth/me                # Get current user
```

#### Restaurant Endpoints

```http
GET    /restaurants            # Get all restaurants
GET    /restaurants/nearby     # Get nearby restaurants
GET    /restaurants/:slug      # Get restaurant by slug
GET    /restaurants/me         # Get my restaurant (owner)
PUT    /restaurants/me         # Update my restaurant
```

#### Order Endpoints

```http
POST   /orders                 # Create new order
GET    /orders/:id             # Get order details
GET    /orders/:id/track       # Track order
PUT    /orders/:id/status      # Update order status (restaurant)
POST   /orders/:id/cancel      # Cancel order
```

### Example API Call

**Create Order:**

```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "restaurant_id_here",
    "items": [
      {
        "productId": "product_id_here",
        "quantity": 2
      }
    ],
    "deliveryAddressId": "address_id_here",
    "paymentMethod": "online"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "order_id",
      "orderNumber": "ORD20240101001",
      "status": "placed",
      "pricing": {
        "grandTotal": 450
      }
    }
  }
}
```

### Full API Documentation

For complete API documentation with examples, visit:

- **Postman Collection**: [Import Link](#)
- **Swagger UI**: http://localhost:5000/api/docs (when running locally)

---

## 🔐 Environment Variables

### Backend Environment Variables

| Variable                | Description                          | Required | Default     |
| ----------------------- | ------------------------------------ | -------- | ----------- |
| `NODE_ENV`              | Environment (development/production) | Yes      | development |
| `PORT`                  | Server port                          | Yes      | 5000        |
| `MONGODB_URI`           | MongoDB connection string            | Yes      | -           |
| `REDIS_URL`             | Redis connection string              | No       | -           |
| `JWT_SECRET`            | JWT signing secret                   | Yes      | -           |
| `JWT_REFRESH_SECRET`    | Refresh token secret                 | Yes      | -           |
| `JWT_EXPIRE`            | Access token expiry                  | No       | 15m         |
| `JWT_REFRESH_EXPIRE`    | Refresh token expiry                 | No       | 7d          |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                | Yes      | -           |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                   | Yes      | -           |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                | Yes      | -           |
| `RAZORPAY_KEY_ID`       | Razorpay key ID                      | Yes      | -           |
| `RAZORPAY_KEY_SECRET`   | Razorpay key secret                  | Yes      | -           |
| `FIREBASE_PROJECT_ID`   | Firebase project ID                  | Yes      | -           |
| `FIREBASE_PRIVATE_KEY`  | Firebase private key                 | Yes      | -           |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email                | Yes      | -           |
| `SMTP_HOST`             | Email SMTP host                      | No       | -           |
| `SMTP_PORT`             | Email SMTP port                      | No       | 587         |
| `SMTP_USER`             | Email username                       | No       | -           |
| `SMTP_PASS`             | Email password                       | No       | -           |
| `CLIENT_URLS`           | Allowed CORS origins                 | Yes      | -           |

### Frontend Environment Variables

**Restaurant Panel & Admin Dashboard:**

| Variable                 | Description          | Required |
| ------------------------ | -------------------- | -------- |
| `NEXT_PUBLIC_API_URL`    | Backend API URL      | Yes      |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL | Yes      |
| `NEXT_PUBLIC_APP_NAME`   | Application name     | No       |

---

## 💻 Development

### Development Workflow

```bash
# 1. Create a new feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes

# 3. Run tests
pnpm test

# 4. Lint your code
pnpm lint

# 5. Commit your changes
git add .
git commit -m "feat: add your feature description"

# 6. Push to your branch
git push origin feature/your-feature-name

# 7. Create a Pull Request
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check code style
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Format code
pnpm format
```

### Database Seeding

Seed the database with sample data for development:

```bash
cd apps/backend
pnpm seed
```

This will create:

- 10 sample restaurants
- 50 sample products
- 20 sample users
- 5 sample orders

### Hot Reloading

All apps support hot reloading during development:

- Backend: Uses `nodemon`
- Next.js apps: Built-in hot reload
- Flutter apps: Hot reload with `r` key

---

## 🚀 Deployment

### Production Deployment

#### Option 1: VPS Deployment (Recommended)

**Prerequisites:**

- Ubuntu 22.04 LTS server
- Domain name
- SSL certificate (Let's Encrypt)

**Step-by-step guide:**

1. **Setup Server**

```bash
# SSH into your server
ssh root@your-server-ip

# Run setup script
curl -o setup.sh https://raw.githubusercontent.com/yourusername/okados/main/scripts/setup.sh
chmod +x setup.sh
./setup.sh
```

2. **Deploy Backend**

```bash
cd /var/www/okados
git pull origin main
pnpm install --production
pnpm build
pm2 reload ecosystem.config.js
```

3. **Deploy Frontend**

```bash
# Restaurant Panel
cd apps/restaurant-panel
pnpm build
pm2 start npm --name "restaurant-panel" -- start

# Admin Dashboard
cd apps/admin-dashboard
pnpm build
pm2 start npm --name "admin-dashboard" -- start
```

#### Option 2: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 3: Vercel Deployment (Frontend Only)

```bash
# Deploy Next.js apps to Vercel
cd apps/restaurant-panel
vercel --prod

cd ../admin-dashboard
vercel --prod
```

### CI/CD Pipeline

We use GitHub Actions for automated deployment:

**Workflow:** `.github/workflows/deploy.yml`

Triggers:

- Push to `main` branch
- Manual workflow dispatch

### Mobile App Deployment

**Android:**

```bash
cd apps/user-app
flutter build apk --release
# APK will be at: build/app/outputs/flutter-apk/app-release.apk

# Or build for Play Store
flutter build appbundle --release
```

**iOS:**

```bash
cd apps/user-app
flutter build ios --release
# Then archive and upload via Xcode
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run backend tests
pnpm --filter @okados/backend test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test path/to/test.spec.js

# Run in watch mode
pnpm test:watch
```

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── services/
│   ├── utils/
│   └── models/
├── integration/       # Integration tests
│   └── api/
└── e2e/              # End-to-end tests
    └── flows/
```

### Writing Tests

Example test:

```javascript
import { describe, it, expect } from "@jest/globals";
import { calculateDistance } from "../utils/helpers.js";

describe("calculateDistance", () => {
  it("should calculate distance between two coordinates", () => {
    const lat1 = 28.6139;
    const lng1 = 77.209;
    const lat2 = 19.076;
    const lng2 = 72.8777;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);

    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1200);
  });
});
```

---

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### How to Contribute

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/okados.git
   ```
3. **Create a branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make your changes**
5. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update dependencies
```

### Code Review Process

1. All PRs require at least one review
2. All tests must pass
3. Code must follow style guide
4. Documentation must be updated

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Okados

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 💬 Support

### Getting Help

- 📖 **Documentation**: [docs.okados.com](https://docs.okados.com)
- 💬 **Discord**: [Join our community](https://discord.gg/okados)
- 📧 **Email**: support@okados.com
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/okados/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/okados/discussions)

### FAQ

**Q: Can I use this for commercial purposes?**
A: Yes! Okados is open-source and free to use commercially under the MIT license.

**Q: How do I change the branding?**
A: Update the logo, colors, and app name in the configuration files. See [Branding Guide](docs/branding.md).

**Q: What's the expected cost to run this?**
A: Initial costs are around $250-300/month for infrastructure. See [Cost Analysis](docs/costs.md).

**Q: Can I contribute without coding?**
A: Absolutely! We need help with documentation, design, testing, and more.

---

## 🙏 Acknowledgments

### Built With Love Using

- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Next.js](https://nextjs.org/) - React framework
- [Flutter](https://flutter.dev/) - Mobile framework
- [Socket.io](https://socket.io/) - Real-time engine
- [Razorpay](https://razorpay.com/) - Payment gateway

### Inspired By

- Swiggy
- Zomato
- UberEats
- DoorDash

### Special Thanks

- To all our contributors
- The open-source community
- Early adopters and testers

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/okados?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/okados?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/yourusername/okados?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/okados)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/okados)
![GitHub last commit](https://img.shields.io/github/last-commit/yourusername/okados)

---

## 🗺️ Roadmap

### Version 1.0 (Current)

- ✅ Core ordering functionality
- ✅ Payment integration
- ✅ Real-time tracking
- ✅ Admin panel

### Version 1.1 (Next Release)

- 🔲 Multi-language support
- 🔲 Dark mode
- 🔲 Delivery partner app
- 🔲 Advanced analytics

### Version 2.0 (Future)

- 🔲 AI-powered recommendations
- 🔲 Loyalty program
- 🔲 Subscription plans
- 🔲 Table booking
- 🔲 Grocery delivery

See [ROADMAP.md](ROADMAP.md) for detailed plans.

---

## 👥 Team

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/yourusername">
        <img src="https://github.com/yourusername.png" width="100px;" alt=""/>
        <br />
        <sub><b>Your Name</b></sub>
      </a>
      <br />
      <sub>Creator & Lead Developer</sub>
    </td>
    <!-- Add more team members -->
  </tr>
</table>

---

## 📞 Contact

**Project Maintainer**: Your Name

- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com
- Twitter: [@yourhandle](https://twitter.com/yourhandle)

**Company**: Okados Inc.

- Website: https://okados.com
- Email: info@okados.com

---

<div align="center">

### ⭐ Star Us on GitHub!

If you find this project useful, please consider giving it a star ⭐

**Made with ❤️ by the Okados Team**

[⬆ Back to Top](#-okados---complete-food-delivery-platform)

</div>
