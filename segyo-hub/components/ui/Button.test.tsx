import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders the primary variant by default', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button', { name: '저장' })).toHaveClass('bg-primary-600')
  })

  it('applies the danger variant', () => {
    render(<Button variant="danger">삭제</Button>)
    expect(screen.getByRole('button', { name: '삭제' })).toHaveClass('bg-danger')
  })

  it('applies the sm size height', () => {
    render(<Button size="sm">x</Button>)
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass('h-8')
  })

  it('forwards extra className', () => {
    render(<Button className="w-full">전송</Button>)
    expect(screen.getByRole('button', { name: '전송' })).toHaveClass('w-full')
  })
})
