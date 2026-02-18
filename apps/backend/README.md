# Okados Backend

Professional Node.js backend for Okados Food Delivery Platform.

## Features

- User Authentication (JWT)
- Restaurant Management
- Product/Menu Management
- Order Processing
- Payment Integration (Razorpay)
- Real-time Notifications (Socket.io)
- Push Notifications (Firebase)
- Image Upload (Cloudinary)
- Rate Limiting
- Input Validation

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- Redis
- Socket.io
- Firebase Admin SDK

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run development server
npm run dev

# Run production server
npm start
```

## API Endpoints

### Authentication
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - Login user
- POST `/api/v1/auth/refresh-token` - Refresh token
- POST `/api/v1/auth/forgot-password` - Forgot password
- POST `/api/v1/auth/reset-password` - Reset password

### Users
- GET `/api/v1/users/profile` - Get user profile
- PUT `/api/v1/users/profile` - Update user profile
- PUT `/api/v1/users/address` - Add/update address

### Restaurants
- GET `/api/v1/restaurants` - List restaurants
- GET `/api/v1/restaurants/:id` - Get restaurant details
- POST `/api/v1/restaurants` - Create restaurant
- PUT `/api/v1/restaurants/:id` - Update restaurant
- DELETE `/api/v1/restaurants/:id` - Delete restaurant

### Products
- GET `/api/v1/products` - List products
- GET `/api/v1/products/:id` - Get product details
- POST `/api/v1/products` - Create product
- PUT `/api/v1/products/:id` - Update product
- DELETE `/api/v1/products/:id` - Delete product

### Orders
- POST `/api/v1/orders` - Create order
- GET `/api/v1/orders` - List orders
- GET `/api/v1/orders/:id` - Get order details
- PUT `/api/v1/orders/:id/status` - Update order status

### Payments
- POST `/api/v1/payments/create-order` - Create payment order
- POST `/api/v1/payments/verify` - Verify payment

## License

MIT
