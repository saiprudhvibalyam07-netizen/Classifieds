import { useEffect, useState } from 'react'
import { categories } from '../../data/categories'
import { getCategoryCounts } from '../../services/listingService'
import { CategoryCard } from './CategoryCard'
import type { CategoryCountMap } from '../../services/listingService'

export function FeatureMenu() {
  const [counts, setCounts] = useState<CategoryCountMap | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    getCategoryCounts()
      .then((data) => {
        if (mounted) {
          setCounts(data)
          setError(false)
        }
      })
      .catch(() => {
        if (mounted) setError(true)
      })

    return () => { mounted = false }
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-label="Browse categories">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Browse Categories
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Find what you are looking for by category
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => {
          const listingCount = counts != null
            ? (counts[category.slug] ?? 0)
            : null

          return (
            <CategoryCard
              key={category.id}
              category={category}
              listingCount={error ? null : listingCount}
            />
          )
        })}
      </div>
    </section>
  )
}
