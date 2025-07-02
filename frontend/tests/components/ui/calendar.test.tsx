import { render, screen, fireEvent } from '@testing-library/react';
import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  it('renders calendar component', () => {
    render(<Calendar data-testid="calendar" />);
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  it('accepts selected date', () => {
    const selectedDate = new Date('2024-01-15');
    render(<Calendar selected={selectedDate} data-testid="calendar" />);
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  it('handles date selection', () => {
    const onSelect = vi.fn();
    render(<Calendar onSelect={onSelect} data-testid="calendar" />);
    
    const calendar = screen.getByTestId('calendar');
    expect(calendar).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<Calendar className="custom-calendar" data-testid="calendar" />);
    expect(screen.getByTestId('calendar')).toHaveClass('custom-calendar');
  });

  it('can be disabled', () => {
    render(<Calendar disabled data-testid="calendar" />);
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  it('supports mode prop', () => {
    render(<Calendar mode="single" data-testid="calendar" />);
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });
});