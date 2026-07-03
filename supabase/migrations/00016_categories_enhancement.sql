-- Migration 00016: Categories Enhancement
-- Adds description and display_order columns, expands from 6 to 16 categories

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

UPDATE categories SET description = 'Cars, bikes, scooters, and other vehicles', display_order = 1 WHERE slug = 'vehicles';
UPDATE categories SET description = 'Apartments, houses, rooms for rent or sale', display_order = 2 WHERE slug = 'housing';
UPDATE categories SET description = 'Job openings and employment opportunities', display_order = 3 WHERE slug = 'jobs';
UPDATE categories SET description = 'Professional and personal services', display_order = 4 WHERE slug = 'services';
UPDATE categories SET description = 'New and used items for sale', display_order = 5 WHERE slug = 'items-for-sale';
UPDATE categories SET description = 'Community events, activities, and groups', display_order = 6 WHERE slug = 'community';

INSERT INTO categories (name, slug, icon, description, display_order) VALUES
  ('Property', 'property', 'building2', 'Real estate: houses, apartments, land, and commercial properties', 7),
  ('Mobiles & Tablets', 'mobiles-tablets', 'smartphone', 'Mobile phones, tablets, and accessories', 8),
  ('Electronics', 'electronics', 'monitor', 'TVs, laptops, audio equipment, and gadgets', 9),
  ('Furniture & Home', 'furniture-home', 'sofa', 'Furniture, home decor, and household items', 10),
  ('Education', 'education', 'book-open', 'Courses, tutoring, and educational services', 11),
  ('Business & Industrial', 'business-industrial', 'building2', 'Business equipment, industrial machinery, and commercial listings', 12),
  ('Pets', 'pets', 'dog', 'Pets for adoption, sale, and pet supplies', 13),
  ('Kids', 'kids', 'baby', 'Baby gear, kids clothing, toys, and children items', 14),
  ('Sports & Hobbies', 'sports-hobbies', 'trophy', 'Sports equipment, gym gear, hobbies, and collectibles', 15),
  ('Fashion & Lifestyle', 'fashion-lifestyle', 'shirt', 'Clothing, accessories, beauty, and personal care', 16),
  ('Events', 'events', 'calendar', 'Event tickets, planning, and party supplies', 17),
  ('Matrimonial', 'matrimonial', 'heart', 'Matrimonial profiles and wedding services', 18);
