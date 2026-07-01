import {
  Car,
  Building,
  Briefcase,
  Wrench,
  Package,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

export type CategoryData = {
  id: string
  name: string
  slug: string
  icon: ComponentType<LucideProps>
}

export const categories: CategoryData[] = [
  { id: 'vehicles', name: 'Vehicles', slug: 'vehicles', icon: Car },
  { id: 'housing', name: 'Housing', slug: 'housing', icon: Building },
  { id: 'jobs', name: 'Jobs', slug: 'jobs', icon: Briefcase },
  { id: 'services', name: 'Services', slug: 'services', icon: Wrench },
  { id: 'items-for-sale', name: 'Items for Sale', slug: 'items-for-sale', icon: Package },
  { id: 'community', name: 'Community', slug: 'community', icon: Users },
]
