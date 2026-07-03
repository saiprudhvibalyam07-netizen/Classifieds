import {
  Car,
  Building2,
  Briefcase,
  Smartphone,
  Monitor,
  Sofa,
  Wrench,
  BookOpen,
  Building,
  Dog,
  Baby,
  Trophy,
  Shirt,
  Calendar,
  Heart,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

export type CategoryData = {
  id: string
  name: string
  slug: string
  icon: ComponentType<LucideProps>
  description: string
}

export const categories: CategoryData[] = [
  { id: 'property',        name: 'Property',           slug: 'property',         icon: Building2,   description: 'Real estate: houses, apartments, land, and commercial properties' },
  { id: 'vehicles',        name: 'Vehicles',           slug: 'vehicles',         icon: Car,         description: 'Cars, bikes, scooters, and other vehicles' },
  { id: 'jobs',            name: 'Jobs',               slug: 'jobs',             icon: Briefcase,   description: 'Job openings and employment opportunities' },
  { id: 'mobiles-tablets', name: 'Mobiles & Tablets',  slug: 'mobiles-tablets',  icon: Smartphone,  description: 'Mobile phones, tablets, and accessories' },
  { id: 'electronics',     name: 'Electronics',        slug: 'electronics',      icon: Monitor,     description: 'TVs, laptops, audio equipment, and gadgets' },
  { id: 'furniture-home',  name: 'Furniture & Home',   slug: 'furniture-home',   icon: Sofa,        description: 'Furniture, home decor, and household items' },
  { id: 'services',        name: 'Services',           slug: 'services',         icon: Wrench,      description: 'Professional and personal services' },
  { id: 'education',       name: 'Education',          slug: 'education',        icon: BookOpen,    description: 'Courses, tutoring, and educational services' },
  { id: 'business-industrial', name: 'Business & Industrial', slug: 'business-industrial', icon: Building, description: 'Business equipment, industrial machinery, and commercial listings' },
  { id: 'pets',            name: 'Pets',               slug: 'pets',             icon: Dog,         description: 'Pets for adoption, sale, and pet supplies' },
  { id: 'kids',            name: 'Kids',               slug: 'kids',             icon: Baby,        description: 'Baby gear, kids clothing, toys, and children items' },
  { id: 'sports-hobbies',  name: 'Sports & Hobbies',   slug: 'sports-hobbies',   icon: Trophy,      description: 'Sports equipment, gym gear, hobbies, and collectibles' },
  { id: 'fashion-lifestyle', name: 'Fashion & Lifestyle', slug: 'fashion-lifestyle', icon: Shirt,   description: 'Clothing, accessories, beauty, and personal care' },
  { id: 'events',          name: 'Events',             slug: 'events',           icon: Calendar,    description: 'Event tickets, planning, and party supplies' },
  { id: 'matrimonial',     name: 'Matrimonial',        slug: 'matrimonial',      icon: Heart,       description: 'Matrimonial profiles and wedding services' },
  { id: 'community',       name: 'Community',          slug: 'community',        icon: Users,       description: 'Community events, activities, and groups' },
]
