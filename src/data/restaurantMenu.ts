import { MenuItem, Category } from '../types';
import { OFFICIAL_CATEGORIES, CATEGORY_NAMES } from './menuCategories';
import { FOOD_MENU_ITEMS } from './foodMenuItems';
import { BEVERAGE_MENU_ITEMS } from './beverageMenuItems';

export const OFFICIAL_MENU_ITEMS: MenuItem[] = [
  ...FOOD_MENU_ITEMS,
  ...BEVERAGE_MENU_ITEMS
];

export { OFFICIAL_CATEGORIES, CATEGORY_NAMES, FOOD_MENU_ITEMS, BEVERAGE_MENU_ITEMS };

export const RESTAURANT_PROFILE = {
  name: 'The Fat Buddha Delight',
  tagline: 'Good Food, Good Mood',
  social: {
    instagram: '@FAT_BUDDHA_DELIGHT',
    tiktok: '@fat_buddha_delight'
  },
  openingHours: '10:00 AM - 10:30 PM',
  currency: 'Rs.'
};
