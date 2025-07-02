import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

describe('RadioGroup', () => {
  test('renders radio group with items', () => {
    render(
      <RadioGroup defaultValue="option1">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option1" id="option1" />
          <Label htmlFor="option1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option2" id="option2" />
          <Label htmlFor="option2">Option 2</Label>
        </div>
      </RadioGroup>
    )

    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  test('selects radio option when clicked', () => {
    const handleValueChange = vi.fn()
    
    render(
      <RadioGroup onValueChange={handleValueChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option1" id="option1" />
          <Label htmlFor="option1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option2" id="option2" />
          <Label htmlFor="option2">Option 2</Label>
        </div>
      </RadioGroup>
    )

    fireEvent.click(screen.getByLabelText('Option 1'))
    expect(handleValueChange).toHaveBeenCalledWith('option1')
  })

  test('has correct default value', () => {
    render(
      <RadioGroup defaultValue="option2">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option1" id="option1" />
          <Label htmlFor="option1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option2" id="option2" />
          <Label htmlFor="option2">Option 2</Label>
        </div>
      </RadioGroup>
    )

    const option2 = screen.getByLabelText('Option 2')
    expect(option2).toBeChecked()
  })

  test('applies custom className', () => {
    render(
      <RadioGroup className="custom-radio-group" data-testid="radio-group">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option1" id="option1" className="custom-item" />
          <Label htmlFor="option1">Option 1</Label>
        </div>
      </RadioGroup>
    )

    const radioGroup = screen.getByTestId('radio-group')
    expect(radioGroup).toHaveClass('custom-radio-group')
  })
})