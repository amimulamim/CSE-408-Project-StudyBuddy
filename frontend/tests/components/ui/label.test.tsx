import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/label';

describe('Label', () => {
  it('renders with default styling', () => {
    render(<Label data-testid="label">Test Label</Label>);
    const label = screen.getByTestId('label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass(
      'text-sm',
      'font-medium',
      'leading-none'
    );
  });

  it('accepts custom className', () => {
    render(<Label className="custom-class" data-testid="label">Label</Label>);
    expect(screen.getByTestId('label')).toHaveClass('custom-class');
  });

  it('can be associated with form elements', () => {
    render(
      <>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" />
      </>
    );
    
    const label = screen.getByText('Test Label');
    const input = screen.getByRole('textbox');
    
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('renders children correctly', () => {
    render(<Label>Label Text</Label>);
    expect(screen.getByText('Label Text')).toBeInTheDocument();
  });
});