export type FilterDef = {
  key: string
  label: string
  type: 'select' | 'range'
  options?: { value: string; label: string }[]
  minKey?: string
  maxKey?: string
}

export type CategoryFilterConfig = {
  filters: FilterDef[]
  sortOptions: { value: string; label: string }[]
}

const priceOptions = [
  { value: '0-1000', label: 'Under $1,000' },
  { value: '1000-5000', label: '$1,000 - $5,000' },
  { value: '5000-10000', label: '$5,000 - $10,000' },
  { value: '10000-50000', label: '$10,000 - $50,000' },
  { value: '50000-100000', label: '$50,000 - $100,000' },
  { value: '100000+', label: '$100,000+' },
]

const sortOptions = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export const categoryFilterConfigs: Record<string, CategoryFilterConfig> = {
  property: {
    filters: [
      { key: 'property_type', label: 'Property Type', type: 'select', options: [
        { value: 'apartment', label: 'Apartment' },
        { value: 'house', label: 'House' },
        { value: 'villa', label: 'Villa' },
        { value: 'land', label: 'Land' },
        { value: 'commercial', label: 'Commercial' },
      ]},
      { key: 'bedrooms', label: 'Bedrooms', type: 'select', options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4+', label: '4+' },
      ]},
      { key: 'bathrooms', label: 'Bathrooms', type: 'select', options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3+', label: '3+' },
      ]},
      { key: 'furnished', label: 'Furnished', type: 'select', options: [
        { value: 'fully', label: 'Fully Furnished' },
        { value: 'semi', label: 'Semi Furnished' },
        { value: 'unfurnished', label: 'Unfurnished' },
      ]},
      { key: 'price', label: 'Price Range', type: 'range', options: priceOptions },
    ],
    sortOptions,
  },
  vehicles: {
    filters: [
      { key: 'brand', label: 'Brand', type: 'select', options: [
        { value: 'toyota', label: 'Toyota' },
        { value: 'honda', label: 'Honda' },
        { value: 'hyundai', label: 'Hyundai' },
        { value: 'maruti', label: 'Maruti Suzuki' },
        { value: 'tata', label: 'Tata' },
        { value: 'mahindra', label: 'Mahindra' },
        { value: 'bmw', label: 'BMW' },
        { value: 'mercedes', label: 'Mercedes' },
        { value: 'audi', label: 'Audi' },
        { value: 'other', label: 'Other' },
      ]},
      { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: [
        { value: 'petrol', label: 'Petrol' },
        { value: 'diesel', label: 'Diesel' },
        { value: 'electric', label: 'Electric' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'cng', label: 'CNG' },
      ]},
      { key: 'year', label: 'Year', type: 'select', options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
        { value: 'older', label: '2017 & Older' },
      ]},
      { key: 'transmission', label: 'Transmission', type: 'select', options: [
        { value: 'automatic', label: 'Automatic' },
        { value: 'manual', label: 'Manual' },
      ]},
      { key: 'condition', label: 'Condition', type: 'select', options: [
        { value: 'new', label: 'New' },
        { value: 'used', label: 'Used' },
      ]},
      { key: 'price', label: 'Price Range', type: 'range', options: priceOptions },
    ],
    sortOptions,
  },
  jobs: {
    filters: [
      { key: 'job_type', label: 'Job Type', type: 'select', options: [
        { value: 'full-time', label: 'Full Time' },
        { value: 'part-time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'internship', label: 'Internship' },
        { value: 'freelance', label: 'Freelance' },
      ]},
      { key: 'experience', label: 'Experience', type: 'select', options: [
        { value: '0-1', label: '0-1 Years' },
        { value: '1-3', label: '1-3 Years' },
        { value: '3-5', label: '3-5 Years' },
        { value: '5-10', label: '5-10 Years' },
        { value: '10+', label: '10+ Years' },
      ]},
      { key: 'remote', label: 'Remote', type: 'select', options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'hybrid', label: 'Hybrid' },
      ]},
      { key: 'price', label: 'Salary Range', type: 'range', options: [
        { value: '0-30000', label: 'Under $30K' },
        { value: '30000-50000', label: '$30K - $50K' },
        { value: '50000-100000', label: '$50K - $100K' },
        { value: '100000-150000', label: '$100K - $150K' },
        { value: '150000+', label: '$150K+' },
      ]},
    ],
    sortOptions,
  },
  services: {
    filters: [
      { key: 'service_type', label: 'Service Type', type: 'select', options: [
        { value: 'home', label: 'Home Services' },
        { value: 'auto', label: 'Auto Services' },
        { value: 'beauty', label: 'Beauty & Spa' },
        { value: 'health', label: 'Health & Fitness' },
        { value: 'tech', label: 'Tech Support' },
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'legal', label: 'Legal' },
        { value: 'consulting', label: 'Consulting' },
      ]},
      { key: 'price', label: 'Price Range', type: 'range', options: priceOptions },
    ],
    sortOptions,
  },
}
