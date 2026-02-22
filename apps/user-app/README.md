# Okados User App

Food Delivery Customer App built with Flutter

## Getting Started

### Prerequisites
- Flutter SDK (3.0.0 or higher)
- Dart SDK (3.0.0 or higher)
- Android SDK (for Android builds)
- Xcode (for iOS builds)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your API keys:
   - API_BASE_URL: Your backend API URL
   - RAZORPAY_KEY_ID: Your Razorpay key
   - GOOGLE_MAPS_API_KEY: Your Google Maps API key

### Running the App

```bash
# Run on Android
flutter run -d android

# Run on iOS
flutter run -d ios
```

### Project Structure

```
lib/
├── core/              # Core utilities, constants, theme
├── data/              # Data layer (models, repositories, services)
├── providers/         # Riverpod providers
└── presentation/      # UI layer (screens, widgets)
```

## Features

- User authentication (login, register, forgot password)
- Restaurant browsing
- Food ordering
- Cart management
- Order tracking
- User profile management
- Multiple payment methods
- Push notifications

## License

This project is proprietary software. All rights reserved.
