import { Category } from '../types';

export const OFFICIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-special',
    name: 'Special',
    description: 'Chef signature delights, platter feasts, and house specialty noodles',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-momo',
    name: 'MOMO',
    description: 'Handcrafted Himalayan dumplings: Steamed, Fried, Kothey, Jhol, & Chilly',
    imageUrl: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&w=600&q=80',
    sortOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-chaumin',
    name: 'Chaumin',
    description: 'Classic wok-tossed street style chowmein noodles with mountain spices',
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
    sortOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-hakka-noodles',
    name: 'Hakka Noodles',
    description: 'Indo-Chinese style aromatic tossed noodles with fresh crunchy vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    sortOrder: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-fried-rice',
    name: 'Fried Rice',
    description: 'Fragrant high-flame wok tossed jasmine rice with vegetables and proteins',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
    sortOrder: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-chilly',
    name: 'Chilly',
    description: 'Sizzling spicy stir-fries with crispy capsicum, red onions, and hot soya glaze',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    sortOrder: 6,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-snacks',
    name: 'Snacks',
    description: 'Crispy bites, sadheko, spiced corn, pakora, aloo, and finger foods',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    sortOrder: 7,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-choila',
    name: 'Choila Item',
    description: 'Traditional Newari fire-charred marinated meat with timur, garlic & mustard oil',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    sortOrder: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-pork-buff',
    name: 'Pork & Buff Specials',
    description: 'Tawa-seared pork, Himalayan sukuti jerky, buff sadheko, and sausages',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    sortOrder: 9,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-thuppa-mocha',
    name: 'Thuppa & Mocha',
    description: 'Steaming comfort bowls of Himalayan thukpa noodle soup and mocha dumplings',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    sortOrder: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-hot-beverage',
    name: 'Hot Beverage',
    description: 'Fresh milk & black teas, freshly brewed coffee, and hot lemon honey',
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
    sortOrder: 11,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-cold-drinks',
    name: 'Cold Drinks',
    description: 'Chilled soft drinks, iced virgin mojitos, cold coffee, and energy drinks',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    sortOrder: 12,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-lassi-shakes',
    name: 'Lassi / Milkshake',
    description: 'Traditional thick churned yogurt lassi and indulgent ice-cream milkshakes',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    sortOrder: 13,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-beer',
    name: 'Beer',
    description: 'Chilled local and international lager, strong beers, and pints',
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
    sortOrder: 14,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-wine-chayang',
    name: 'Wine & Chayang',
    description: 'Local traditional Chhyang white rice brew and Manang Valley premium wines',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    sortOrder: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-hard-drink',
    name: 'Hard Drink',
    description: 'Whiskies, rums, and vodkas served in 60ml, 90ml, 180ml, 360ml, & 750ml bottles',
    imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=600&q=80',
    sortOrder: 16,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-hukka-smoke',
    name: 'Hukka & Smokes',
    description: 'Flavored hookah pipes, icy chillers, extra coals, and cigarettes',
    imageUrl: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80',
    sortOrder: 17,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const CATEGORY_NAMES = OFFICIAL_CATEGORIES.map(c => c.name);
