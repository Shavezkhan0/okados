# ============================================
# OKADOS BACKEND API - cURL COMMANDS
# ============================================
# Base URL
BASE_URL="http://localhost:5000/api/v1"

# ============================================
# AUTH APIs
# ============================================

# 1. Register
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123"
  }'

# 2. Login
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# 3. Verify OTP (replace OTP with actual code)
curl -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "otp": "123456"
  }'

# 4. Resend OTP
curl -X POST "$BASE_URL/auth/resend-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890"
  }'

# 5. Get Me (replace TOKEN with access token)
curl -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 6. Logout
curl -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"


# ============================================
# USER APIs
# ============================================

# Get Profile
curl -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update Profile
curl -X PUT "$BASE_URL/users/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "John Updated",
    "phone": "+1234567890"
  }'

# Get Addresses
curl -X GET "$BASE_URL/users/addresses" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Add Address
curl -X POST "$BASE_URL/users/address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "label": "Home",
    "addressLine1": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "pincode": "10001",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "isDefault": true
  }'

# Get Favorites
curl -X GET "$BASE_URL/users/favorites" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"


# ============================================
# RESTAURANT APIs
# ============================================

# Get All Restaurants
curl -X GET "$BASE_URL/restaurants?page=1&limit=10"

# Get Nearby Restaurants
curl -X GET "$BASE_URL/restaurants/nearby?lat=40.7128&lng=-74.006&radius=5"

# Search Restaurants
curl -X GET "$BASE_URL/restaurants/search?q=pizza"

# Get Restaurant by Slug
curl -X GET "$BASE_URL/restaurants/slug/your-restaurant-slug"

# Register Restaurant
curl -X POST "$BASE_URL/restaurants/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My Restaurant",
    "description": "Best food in town",
    "logo": "https://example.com/logo.jpg",
    "contact": {
      "phone": "+1234567890",
      "email": "restaurant@example.com"
    },
    "address": {
      "addressLine1": "123 Food Street",
      "city": "New York",
      "state": "NY",
      "pincode": "10001",
      "latitude": 40.7128,
      "longitude": -74.006
    },
    "cuisines": ["Italian", "Pizza"],
    "deliveryRadius": 5,
    "pricing": {
      "costForTwo": 500,
      "deliveryFee": 50
    }
  }'

# Get My Restaurant
curl -X GET "$BASE_URL/restaurants/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update Restaurant
curl -X PUT "$BASE_URL/restaurants/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Updated Name",
    "description": "Updated description"
  }'

# Toggle Restaurant Open/Close
curl -X PUT "$BASE_URL/restaurants/me/toggle-open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"isOpen": true}'


# ============================================
# PRODUCT APIs
# ============================================

# Get Categories
curl -X GET "$BASE_URL/products/categories"

# Get Restaurant Products
curl -X GET "$BASE_URL/products/restaurant/RESTAURANT_ID"

# Search Products
curl -X GET "$BASE_URL/products/search?q=burger"

# Get My Products
curl -X GET "$BASE_URL/products" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create Product
curl -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Classic Burger",
    "description": "Delicious beef burger",
    "category": "Burgers",
    "type": "non-veg",
    "price": 250,
    "discountedPrice": 199,
    "preparationTime": 20,
    "tags": ["bestseller"]
  }'

# Update Product
curl -X PUT "$BASE_URL/products/PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Updated Burger",
    "price": 299
  }'

# Delete Product
curl -X DELETE "$BASE_URL/products/PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"


# ============================================
# ORDER APIs
# ============================================

# Create Order
curl -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "restaurantId": "RESTAURANT_ID",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 2
      }
    ],
    "paymentMethod": "cod"
  }'

# Get User Orders
curl -X GET "$BASE_URL/orders/users/orders" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get Order By ID
curl -X GET "$BASE_URL/orders/ORDER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Track Order
curl -X GET "$BASE_URL/orders/ORDER_ID/track" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Cancel Order
curl -X POST "$BASE_URL/orders/ORDER_ID/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"reason": "Changed my mind"}'

# Rate Order
curl -X POST "$BASE_URL/orders/ORDER_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "food": 5,
    "delivery": 4,
    "comment": "Great food!"
  }'

# Restaurant: Accept Order
curl -X PUT "$BASE_URL/orders/ORDER_ID/accept" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Restaurant: Update Order Status
curl -X PUT "$BASE_URL/orders/ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"status": "preparing"}'


# ============================================
# COUPON APIs
# ============================================

# Get Valid Coupons
curl -X GET "$BASE_URL/coupons/valid" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Validate Coupon
curl -X POST "$BASE_URL/coupons/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "code": "SAVE20",
    "restaurantId": "RESTAURANT_ID",
    "orderAmount": 500
  }'

# Admin: Create Coupon
curl -X POST "$BASE_URL/coupons" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "code": "SAVE20",
    "description": "20% off",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 300,
    "isActive": true
  }'


# ============================================
# REVIEW APIs
# ============================================

# Get Restaurant Reviews
curl -X GET "$BASE_URL/reviews/restaurant/RESTAURANT_ID"

# Create Review
curl -X POST "$BASE_URL/reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "restaurantId": "RESTAURANT_ID",
    "rating": 5,
    "comment": "Amazing food!"
  }'


# ============================================
# NOTIFICATION APIs
# ============================================

# Get Notifications
curl -X GET "$BASE_URL/notifications" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get Unread Count
curl -X GET "$BASE_URL/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Mark as Read
curl -X PUT "$BASE_URL/notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"


# ============================================
# PAYMENT APIs
# ============================================

# Get Payment Methods
curl -X GET "$BASE_URL/payments/methods"

# Check COD Availability
curl -X GET "$BASE_URL/payments/cod/check?restaurantId=ID&orderAmount=500"


# ============================================
# ADMIN APIs
# ============================================

# Admin: Get Dashboard
curl -X GET "$BASE_URL/admin/dashboard" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin: Get All Users
curl -X GET "$BASE_URL/admin/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin: Get All Restaurants
curl -X GET "$BASE_URL/admin/restaurants" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin: Get Pending Restaurants
curl -X GET "$BASE_URL/admin/restaurants/pending" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin: Approve Restaurant
curl -X PUT "$BASE_URL/admin/restaurants/RESTAURANT_ID/approve" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin: Get All Orders
curl -X GET "$BASE_URL/admin/orders" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin: Get Revenue
curl -X GET "$BASE_URL/admin/revenue" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"


# ============================================
# UPLOAD APIs (with file)
# ============================================

# Upload Image
curl -X POST "$BASE_URL/upload/image" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "image=@/path/to/image.jpg"

# Upload Restaurant Image
curl -X POST "$BASE_URL/upload/restaurant" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "image=@/path/to/image.jpg"
