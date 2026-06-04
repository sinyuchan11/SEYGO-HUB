import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProfileStats } from './ProfileStats'

describe('ProfileStats', () => {
  it('renders post count and likes received', () => {
    render(<ProfileStats postCount={5} likesReceived={12} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('게시글')).toBeInTheDocument()
    expect(screen.getByText('받은 좋아요')).toBeInTheDocument()
  })
})
