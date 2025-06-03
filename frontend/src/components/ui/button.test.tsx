import { render, screen } from '@testing-library/react'
import { Button } from "@/components/ui/button"

test('renders button with text', () => {
  render(<Button>Click Me</Button>)
  expect(screen.getByText('Click Me')).toBeInTheDocument()
})
