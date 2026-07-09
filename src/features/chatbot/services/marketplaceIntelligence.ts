import type { MarketplaceListing, MarketplaceCategory, MarketplaceSeller, SearchFilters } from '../types'
import { logger } from './logger'

const listings = new Map<string, MarketplaceListing>()
const categories = new Map<string, MarketplaceCategory>()
const sellers = new Map<string, MarketplaceSeller>()

export async function addListing(listing: MarketplaceListing): Promise<void> {
  listings.set(listing.id, listing)
}

export async function addListings(listingList: MarketplaceListing[]): Promise<void> {
  for (const l of listingList) listings.set(l.id, l)
}

export async function addCategory(cat: MarketplaceCategory): Promise<void> {
  categories.set(cat.id, cat)
}

export async function addCategories(catList: MarketplaceCategory[]): Promise<void> {
  for (const c of catList) categories.set(c.id, c)
}

export async function addSeller(seller: MarketplaceSeller): Promise<void> {
  sellers.set(seller.id, seller)
}

export async function addSellers(sellerList: MarketplaceSeller[]): Promise<void> {
  for (const s of sellerList) sellers.set(s.id, s)
}

export async function searchListings(filters: SearchFilters): Promise<MarketplaceListing[]> {
  let results = Array.from(listings.values())

  if (filters.categories && filters.categories.length > 0) {
    results = results.filter((l) => filters.categories!.includes(l.category))
  }
  if (filters.minPrice !== undefined) {
    results = results.filter((l) => l.price >= filters.minPrice!)
  }
  if (filters.maxPrice !== undefined) {
    results = results.filter((l) => l.price <= filters.maxPrice!)
  }
  if (filters.location) {
    const loc = filters.location.toLowerCase()
    results = results.filter((l) => l.location.toLowerCase().includes(loc))
  }
  if (filters.sellerId) {
    results = results.filter((l) => l.sellerId === filters.sellerId)
  }
  if (filters.status) {
    results = results.filter((l) => l.status === filters.status)
  }
  if (filters.query) {
    const q = filters.query.toLowerCase()
    results = results.filter((l) => l.title.toLowerCase().includes(q))
  }

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  logger.info('listings_searched', { details: { filters, results: results.length } })
  return results
}

export async function searchListingsNL(
  query: string,
  filters: SearchFilters
): Promise<MarketplaceListing[]> {
  const combined: SearchFilters = { ...filters, query }
  return searchListings(combined)
}

export async function getListingDetails(listingId: string): Promise<MarketplaceListing | undefined> {
  return listings.get(listingId)
}

export async function getCategories(): Promise<MarketplaceCategory[]> {
  return Array.from(categories.values())
}

export async function getCategory(categoryId: string): Promise<MarketplaceCategory | undefined> {
  return categories.get(categoryId)
}

export async function getSellerInfo(sellerId: string): Promise<MarketplaceSeller | undefined> {
  return sellers.get(sellerId)
}

export async function seedMarketplaceData(): Promise<void> {
  const cats: MarketplaceCategory[] = [
    { id: 'cat-1', name: 'Electronics', slug: 'electronics', parentId: null, itemCount: 45 },
    { id: 'cat-2', name: 'Furniture', slug: 'furniture', parentId: null, itemCount: 32 },
    { id: 'cat-3', name: 'Vehicles', slug: 'vehicles', parentId: null, itemCount: 28 },
    { id: 'cat-4', name: 'Real Estate', slug: 'real-estate', parentId: null, itemCount: 15 },
    { id: 'cat-5', name: 'Jobs', slug: 'jobs', parentId: null, itemCount: 22 },
    { id: 'cat-6', name: 'Services', slug: 'services', parentId: null, itemCount: 38 },
    { id: 'cat-7', name: 'Clothing', slug: 'clothing', parentId: null, itemCount: 55 },
    { id: 'cat-8', name: 'Books & Media', slug: 'books-media', parentId: null, itemCount: 40 },
    { id: 'cat-9', name: 'Sports & Outdoors', slug: 'sports-outdoors', parentId: null, itemCount: 25 },
    { id: 'cat-10', name: 'Pets', slug: 'pets', parentId: null, itemCount: 12 },
  ]
  await addCategories(cats)

  const sellersList: MarketplaceSeller[] = [
    { id: 'seller-1', name: 'Alice Sharma', rating: 4.8, listingCount: 12, joinedAt: '2024-01-15' },
    { id: 'seller-2', name: 'Bob Patel', rating: 4.5, listingCount: 8, joinedAt: '2024-03-20' },
    { id: 'seller-3', name: 'Carol Singh', rating: 4.9, listingCount: 25, joinedAt: '2023-11-01' },
  ]
  await addSellers(sellersList)

  const listingList: MarketplaceListing[] = [
    { id: 'lst-1', title: 'iPhone 15 Pro 256GB', price: 85000, category: 'Electronics', location: 'Mumbai', sellerId: 'seller-1', status: 'active', images: [], createdAt: '2024-06-01' },
    { id: 'lst-2', title: 'Samsung Galaxy S24', price: 65000, category: 'Electronics', location: 'Delhi', sellerId: 'seller-2', status: 'active', images: [], createdAt: '2024-06-05' },
    { id: 'lst-3', title: 'MacBook Pro M3 14-inch', price: 145000, category: 'Electronics', location: 'Bangalore', sellerId: 'seller-1', status: 'active', images: [], createdAt: '2024-06-10' },
    { id: 'lst-4', title: 'Wooden Dining Table 6-Seater', price: 25000, category: 'Furniture', location: 'Mumbai', sellerId: 'seller-3', status: 'active', images: [], createdAt: '2024-06-08' },
    { id: 'lst-5', title: 'Queen Size Bed with Mattress', price: 18000, category: 'Furniture', location: 'Hyderabad', sellerId: 'seller-2', status: 'active', images: [], createdAt: '2024-06-12' },
    { id: 'lst-6', title: 'Honda City 2022 ZX', price: 850000, category: 'Vehicles', location: 'Chennai', sellerId: 'seller-3', status: 'active', images: [], createdAt: '2024-05-20' },
    { id: 'lst-7', title: 'Toyota Fortuner 2023', price: 3500000, category: 'Vehicles', location: 'Mumbai', sellerId: 'seller-1', status: 'active', images: [], createdAt: '2024-06-15' },
    { id: 'lst-8', title: '2 BHK Apartment for Rent', price: 25000, category: 'Real Estate', location: 'Bangalore', sellerId: 'seller-2', status: 'active', images: [], createdAt: '2024-06-03' },
    { id: 'lst-9', title: 'Sony WH-1000XM5 Headphones', price: 22000, category: 'Electronics', location: 'Pune', sellerId: 'seller-3', status: 'active', images: [], createdAt: '2024-06-14' },
    { id: 'lst-10', title: 'Leather Sofa Set 3+2', price: 45000, category: 'Furniture', location: 'Delhi', sellerId: 'seller-1', status: 'active', images: [], createdAt: '2024-06-07' },
  ]
  await addListings(listingList)

  logger.info('marketplace_data_seeded', {
    details: { categories: cats.length, sellers: sellersList.length, listings: listingList.length },
  })
}

export async function clearMarketplaceData(): Promise<void> {
  listings.clear()
  categories.clear()
  sellers.clear()
}
