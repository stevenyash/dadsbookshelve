import { clsx } from 'clsx'
import { ReactNode } from 'react'

interface CardProps {
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

interface CardSectionProps {
  children?: ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps) {
  return <div className={clsx('card bg-base-100 shadow', className)} {...props}>{children}</div>
}

export function CardHeader({ children, className }: CardSectionProps) {
  return <div className={clsx('card-body', className)}>{children}</div>
}

export function CardTitle({ children, className }: CardSectionProps) {
  return <h3 className={clsx('card-title', className)}>{children}</h3>
}

export function CardContent({ children, className }: CardSectionProps) {
  return <div className={clsx('card-body', className)}>{children}</div>
}

export function CardActions({ children, className }: CardSectionProps) {
  return <div className={clsx('card-actions justify-end', className)}>{children}</div>
}