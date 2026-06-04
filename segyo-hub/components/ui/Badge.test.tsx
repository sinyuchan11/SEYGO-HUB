import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders the neutral tone by default', () => {
    render(<Badge>새 글</Badge>)
    expect(screen.getByText('새 글')).toHaveClass('bg-muted')
  })

  it('applies the primary tone', () => {
    render(<Badge tone="primary">12</Badge>)
    expect(screen.getByText('12')).toHaveClass('bg-primary-100')
  })

  it('applies the danger tone', () => {
    render(<Badge tone="danger">9+</Badge>)
    expect(screen.getByText('9+')).toHaveClass('bg-danger')
  })
})
