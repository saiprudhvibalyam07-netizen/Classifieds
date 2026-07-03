import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryData } from '../../data/categories'

type Props = {
  category: CategoryData
  listingCount: number | null
}

function areEqual(prev: Props, next: Props) {
  return prev.category.id === next.category.id && prev.listingCount === next.listingCount
}

export const CategoryCard = memo(function CategoryCard({ category, listingCount }: Props) {
  const Icon = category.icon

  return (
    <Link
      to={`/category/${category.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      aria-label={`Browse ${category.name} listings`}
    >
      <div className="flex-shrink-0 rounded-xl bg-primary-50 p-3 transition-colors duration-200 group-hover:bg-primary-100">
        <Icon className="h-6 w-6 text-primary-600 transition-all duration-200 group-hover:scale-110 group-hover:text-primary-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{category.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {listingCount != null ? `${listingCount.toLocaleString()} Listings` : '\u2014 Listings'}
        </p>
        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{category.description}</p>
      </div>
    </Link>
  )
}, areEqual)
