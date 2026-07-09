"use client"

import { cn } from '../../utils/cn'

interface ContainerProps {
  as?: 'div' | 'section' | 'article' | 'main' | 'header' | 'footer'
  children: React.ReactNode
  className?: string
  fluid?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl'
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function Container({
  as = 'div',
  children,
  className,
  fluid = false,
  maxWidth = '7xl',
  padding = 'md',
}: ContainerProps) {
  const Component = as as any
  
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
  }
  
  const paddingClasses = {
    none: '',
    xs: 'px-2',
    sm: 'px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 lg:px-8',
    xl: 'px-8',
  }
  
  const baseClasses = fluid 
    ? `w-full ${paddingClasses[padding]}`
    : `${maxWidthClasses[maxWidth]} mx-auto ${paddingClasses[padding]}`
  
  return (
    <Component className={cn(baseClasses, className)}>
      {children}
    </Component>
  )
}
