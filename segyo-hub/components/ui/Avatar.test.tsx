import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows the initial when no image is given', () => {
    render(<Avatar name="홍길동" />)
    expect(screen.getByText('홍')).toBeInTheDocument()
  })

  it('shows ? when name is empty', () => {
    render(<Avatar name="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders an img when src is provided', () => {
    render(<Avatar name="홍길동" src="/a.png" />)
    expect(screen.getByRole('img', { name: '홍길동' })).toBeInTheDocument()
  })

  it('applies the size class', () => {
    const { container } = render(<Avatar name="홍" size={64} />)
    expect(container.firstChild).toHaveClass('h-16')
  })
})
