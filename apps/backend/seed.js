import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import Product from './src/models/Product.js';
import User from './src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://okados:Shavezkhan44@okados.2psclcr.mongodb.net/';

const testRestaurants = [
  {
    name: 'Burger King',
    description: 'The Home of the Whopper - Premium burgers, fries, and more',
    logo: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400',
    banner: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200',
    contact: { email: 'contact@burgerking.com', phone: '+911234567890', whatsapp: '+911234567890' },
    address: { addressLine1: '123 Main Street', addressLine2: 'Downtown', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', coordinates: { type: 'Point', coordinates: [72.8777, 19.0760] } },
    cuisines: ['Fast Food', 'Burgers', 'American'],
    deliveryRadius: 5, timing: { openTime: '10:00', closeTime: '23:00', workingDays: [0, 1, 2, 3, 4, 5, 6] },
    isOpen: true, isApproved: true, isActive: true, rating: { average: 4.2, count: 150 },
    pricing: { costForTwo: 400, deliveryFee: 30, packagingFee: 10 }
  },
  {
    name: 'Domino\'s Pizza',
    description: 'Your favorite pizza delivered hot and fresh',
    logo: 'https://images.unsplash.com/photo-1604384936-07c5d9982353bd3?w=400',
    banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
    contact: { email: 'contact@dominos.com', phone: '+911234567891', whatsapp: '+911234567891' },
    address: { addressLine1: '456 Food Street', addressLine2: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053', coordinates: { type: 'Point', coordinates: [72.8481, 19.1360] } },
    cuisines: ['Pizza', 'Italian', 'Fast Food'],
    deliveryRadius: 5, timing: { openTime: '11:00', closeTime: '23:00', workingDays: [0, 1, 2, 3, 4, 5, 6] },
    isOpen: true, isApproved: true, isActive: true, rating: { average: 4.0, count: 200 },
    pricing: { costForTwo: 500, deliveryFee: 40, packagingFee: 15 }
  },
  {
    name: 'Biryani House',
    description: 'Authentic Indian biryanis and kebabs',
    logo: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
    banner: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200',
    contact: { email: 'contact@biryanihouse.com', phone: '+911234567892', whatsapp: '+911234567892' },
    address: { addressLine1: '789 Biryani Lane', addressLine2: 'Bandra', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', coordinates: { type: 'Point', coordinates: [72.8400, 19.0500] } },
    cuisines: ['Indian', 'Biryani', 'Mughlai'],
    deliveryRadius: 8, timing: { openTime: '12:00', closeTime: '22:00', workingDays: [0, 1, 2, 3, 4, 5, 6] },
    isOpen: true, isApproved: true, isActive: true, rating: { average: 4.5, count: 320 },
    pricing: { costForTwo: 600, deliveryFee: 25, packagingFee: 10 }
  },
  {
    name: 'Chinese Corner',
    description: 'Best Chinese food in town',
    logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    banner: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200',
    contact: { email: 'contact@chinesecorner.com', phone: '+911234567893', whatsapp: '+911234567893' },
    address: { addressLine1: '321 China Town', addressLine2: 'Powai', city: 'Mumbai', state: 'Maharashtra', pincode: '400076', coordinates: { type: 'Point', coordinates: [72.9100, 19.1170] } },
    cuisines: ['Chinese', 'Asian', 'Noodles'],
    deliveryRadius: 6, timing: { openTime: '11:00', closeTime: '21:30', workingDays: [0, 1, 2, 3, 4, 5, 6] },
    isOpen: true, isApproved: true, isActive: true, rating: { average: 3.9, count: 85 },
    pricing: { costForTwo: 450, deliveryFee: 35, packagingFee: 10 }
  },
  {
    name: 'Ice Cream Paradise',
    description: 'Premium ice creams, sundaes, and desserts',
    logo: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400',
    banner: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200',
    contact: { email: 'contact@icecreamparadise.com', phone: '+911234567894', whatsapp: '+911234567894' },
    address: { addressLine1: '555 Sweet Street', addressLine2: 'Juhu', city: 'Mumbai', state: 'Maharashtra', pincode: '400049', coordinates: { type: 'Point', coordinates: [72.8680, 19.0960] } },
    cuisines: ['Desserts', 'Ice Cream', 'Beverages'],
    deliveryRadius: 4, timing: { openTime: '10:00', closeTime: '22:00', workingDays: [0, 1, 2, 3, 4, 5, 6] },
    isOpen: true, isApproved: true, isActive: true, rating: { average: 4.6, count: 180 },
    pricing: { costForTwo: 250, deliveryFee: 20, packagingFee: 5 }
  }
];

const testProducts = [
  { name: 'Whopper', description: 'Flame-grilled beef patty with fresh lettuce, tomato, onion, pickles, and mayo', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', category: 'Burgers', type: 'non-veg', price: 199, discountedPrice: 179, tags: ['bestseller', 'popular'], preparationTime: 15, restaurantIndex: 0 },
  { name: 'Chicken Whopper', description: 'Flame-grilled chicken patty', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400', category: 'Burgers', type: 'non-veg', price: 189, tags: ['popular'], preparationTime: 15, restaurantIndex: 0 },
  { name: 'Veggie Burger', description: 'Crispy vegetable patty', image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400', category: 'Burgers', type: 'veg', price: 149, tags: ['recommended'], preparationTime: 12, restaurantIndex: 0 },
  { name: 'Crispy Fries', description: 'Golden crispy fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', category: 'Fast Food', type: 'veg', price: 99, tags: ['popular'], preparationTime: 8, restaurantIndex: 0 },
  { name: 'Margherita Pizza', description: 'Classic delight with fresh mozzarella, tomato, and basil', image: 'https://images.unsplash.com/photo-1604382355074-af4b05ebc1ac?w=400', category: 'Pizza', type: 'veg', price: 299, discountedPrice: 249, tags: ['bestseller'], preparationTime: 20, restaurantIndex: 1 },
  { name: 'Peppy Paneer Pizza', description: 'Creamy paneer with capsicum', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', category: 'Pizza', type: 'veg', price: 449, tags: ['popular', 'recommended'], preparationTime: 20, restaurantIndex: 1 },
  { name: 'Chicken Dominator', description: 'Loaded with chicken chunks', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', category: 'Pizza', type: 'non-veg', price: 599, tags: ['bestseller'], preparationTime: 25, restaurantIndex: 1 },
  { name: 'Garlic Breadsticks', description: 'Crispy breadsticks with garlic butter', image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400', category: 'Fast Food', type: 'veg', price: 149, tags: ['recommended'], preparationTime: 10, restaurantIndex: 1 },
  { name: 'Chicken Dum Biryani', description: 'Aromatic basmati rice with spiced chicken', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', category: 'Indian', type: 'non-veg', price: 299, discountedPrice: 259, tags: ['bestseller', 'signature'], preparationTime: 30, restaurantIndex: 2 },
  { name: 'Mutton Biryani', description: 'Tender mutton with aromatic spices', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400', category: 'Indian', type: 'non-veg', price: 399, tags: ['bestseller', 'popular'], preparationTime: 35, restaurantIndex: 2 },
  { name: 'Vegetable Biryani', description: 'Mixed vegetables with basmati rice', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', category: 'Indian', type: 'veg', price: 199, tags: ['recommended'], preparationTime: 25, restaurantIndex: 2 },
  { name: 'Chicken Tikka', description: 'Tender chicken grilled to perfection', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', category: 'Indian', type: 'non-veg', price: 250, tags: ['popular'], preparationTime: 20, restaurantIndex: 2 },
  { name: 'Chicken Fried Rice', description: 'Wok-fried rice with chicken', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', category: 'Chinese', type: 'non-veg', price: 199, tags: ['bestseller', 'popular'], preparationTime: 15, restaurantIndex: 3 },
  { name: 'Vegetable Noodles', description: 'Stir-fried noodles with vegetables', image: 'https://images.unsplash.com/photo-1585032226651-f1f6cf9683ba?w=400', category: 'Chinese', type: 'veg', price: 149, tags: ['recommended'], preparationTime: 12, restaurantIndex: 3 },
  { name: 'Spring Rolls', description: 'Crispy vegetable spring rolls', image: 'https://images.unsplash.com/photo-1548507200-3b8a7f7e1d64?w=400', category: 'Chinese', type: 'veg', price: 120, tags: ['popular'], preparationTime: 10, restaurantIndex: 3 },
  { name: 'Chicken Manchurian', description: 'Crispy chicken in spicy sauce', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400', category: 'Chinese', type: 'non-veg', price: 220, tags: ['bestseller'], preparationTime: 18, restaurantIndex: 3 },
  { name: 'Chocolate Ice Cream', description: 'Rich creamy chocolate', image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400', category: 'Desserts', type: 'veg', price: 80, discountedPrice: 60, tags: ['bestseller', 'popular'], preparationTime: 5, restaurantIndex: 4 },
  { name: 'Vanilla Cone', description: 'Classic vanilla in crispy cone', image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400', category: 'Desserts', type: 'veg', price: 60, tags: ['recommended'], preparationTime: 5, restaurantIndex: 4 },
  { name: 'Strawberry Sundae', description: 'Strawberry with sauce and cream', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', category: 'Desserts', type: 'veg', price: 120, tags: ['popular'], preparationTime: 8, restaurantIndex: 4 },
  { name: 'Mango Shake', description: 'Refreshing mango milkshake', image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', category: 'Beverages', type: 'veg', price: 99, tags: ['bestseller', 'recommended'], preparationTime: 5, restaurantIndex: 4 }
];

async function seedDatabase() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let owner = await User.findOne({ email: 'owner@okados.com' });
    if (!owner) {
      owner = await User.create({ name: 'Restaurant Owner', email: 'owner@okados.com', phone: '+911234560000', password: 'password123', role: 'restaurant' });
      console.log('Created restaurant owner');
    }
    console.log('Using owner:', owner.name);

    // First delete all restaurants
    await Restaurant.deleteMany({});
    console.log('Cleared existing restaurants');
    
    await Product.deleteMany({});
    console.log('Cleared existing products');

    const restaurantsWithOwner = testRestaurants.map(r => ({ ...r, ownerId: owner._id }));
    
    // Insert one by one to trigger pre-save hooks
    const createdRestaurants = [];
    for (const restaurant of restaurantsWithOwner) {
      const created = await Restaurant.create(restaurant);
      createdRestaurants.push(created);
    }
    console.log(`Created ${createdRestaurants.length} restaurants`);

    const productsToCreate = testProducts.map(p => {
      const { restaurantIndex, ...rest } = p;
      return { ...rest, restaurantId: createdRestaurants[restaurantIndex]._id };
    });
    await Product.insertMany(productsToCreate);
    console.log(`Created ${productsToCreate.length} products`);

    console.log('\n✅ Seed data created successfully!');
    console.log('\nTest Restaurants:');
    createdRestaurants.forEach(r => console.log(`  - ${r.name}`));
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedDatabase();
