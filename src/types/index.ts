export type Category = {
  id: string
  name: string
  slug: string
  icon: string
  description: string | null
  display_order: number
  created_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: 'user' | 'admin'
  location: string | null
  about: string | null
  created_at: string
}

export type Listing = {
  id: string
  title: string
  description: string
  price: number
  category_id: string
  user_id: string
  location: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  city: string | null
  state: string | null
  condition: 'new' | 'used' | null
  status: 'pending' | 'active' | 'sold' | 'inactive'
  is_featured: boolean
  views_count: number
  created_at: string
  updated_at: string
  category?: Category
  profile?: Profile
  images?: ListingImage[]
}

export type ListingImage = {
  id: string
  listing_id: string
  url: string
  sort_order: number
}

export type Favorite = {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}

export type Conversation = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  last_message: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
  listing?: Listing
  buyer?: Profile
  seller?: Profile
  messages?: Message[]
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  message_attachments: Record<string, unknown>[]
  is_read: boolean
  created_at: string
  updated_at: string | null
  profile?: Profile
}
