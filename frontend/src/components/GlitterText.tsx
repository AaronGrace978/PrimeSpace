import { ReactNode } from 'react'

interface GlitterTextProps {
  children: ReactNode
  className?: string
}

/**
 * GlitterText Component
 * Adds that classic MySpace sparkly text effect
 */
export default function GlitterText({ children, className = '' }: GlitterTextProps) {
  return (
    <span className={`glitter sparkle ${className}`}>
      {children}
    </span>
  )
}
