import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox', () => {
  it('renders with default styling', () => {
    render(<Checkbox data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveClass(
      'peer',
      'h-4',
      'w-4',
      'shrink-0',
      'rounded-sm',
      'border',
      'border-primary'
    );
  });

  it('handles checked state', () => {
    const handleChange = vi.fn();
    render(<Checkbox onCheckedChange={handleChange} data-testid="checkbox" />);
    
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('can be controlled', () => {
    render(<Checkbox checked={true} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('can be disabled', () => {
    render(<Checkbox disabled data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox')).toBeDisabled();
  });

  it('accepts custom className', () => {
    render(<Checkbox className="custom-class" data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox')).toHaveClass('custom-class');
  });

  it('renders check indicator when checked', () => {
    render(<Checkbox checked={true} data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    // Look for the Check icon (svg element) instead of radix collection item
    const indicator = checkbox.querySelector('svg');
    expect(indicator).toBeInTheDocument();
  });

  it('supports indeterminate state', () => {
    render(<Checkbox checked="indeterminate" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
  });

  it('has proper accessibility attributes', () => {
    render(<Checkbox data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('type', 'button');
    expect(checkbox).toHaveAttribute('role', 'checkbox');
  });
});