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
  name: 'The New Delight Restaurant',
  tagline: 'Best Place to Hangout and Enjoy Nature',
  social: {
    instagram: '@THE_DELIGHT_RESTURANT',
    tiktok: '@the_delight_restaurant'
  },
  openingHours: '10:00 AM - 10:30 PM',
  currency: 'Rs.'
};
