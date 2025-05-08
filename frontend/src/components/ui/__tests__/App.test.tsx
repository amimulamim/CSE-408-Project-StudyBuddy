import { render, screen, fireEvent } from '@testing-library/react'
import App from '@/App'

describe('App component', () => {
  test('renders Vite + React header', () => {
    render(<App />)
    expect(screen.getByText(/Vite \+ React/i)).toBeInTheDocument()
  })

  test('increments count when button is clicked', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is/i })
    fireEvent.click(button)
    expect(button).toHaveTextContent('count is 1')
  })

  test('renders shadcn/ui Button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Click me from shadcn ui/i })).toBeInTheDocument()
  })
})
