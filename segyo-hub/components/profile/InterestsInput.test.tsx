import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InterestsInput } from './InterestsInput'

describe('InterestsInput', () => {
  it('adds a trimmed tag on Enter', () => {
    const onChange = vi.fn()
    render(<InterestsInput value={[]} onChange={onChange} />)
    const input = screen.getByPlaceholderText('관심사 입력 후 Enter')
    fireEvent.change(input, { target: { value: ' 게임 ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['게임'])
  })

  it('removes a tag when its × is clicked', () => {
    const onChange = vi.fn()
    render(<InterestsInput value={['게임', '음악']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('게임 제거'))
    expect(onChange).toHaveBeenCalledWith(['음악'])
  })

  it('disables the input at the max', () => {
    const onChange = vi.fn()
    render(<InterestsInput value={['a', 'b', 'c', 'd', 'e']} onChange={onChange} />)
    expect(screen.getByPlaceholderText('최대 5개')).toBeDisabled()
  })
})
