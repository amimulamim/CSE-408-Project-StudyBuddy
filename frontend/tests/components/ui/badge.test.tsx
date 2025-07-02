import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge data-testid="badge">Default Badge</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'border', 'px-2.5', 'py-0.5', 'text-xs', 'font-semibold');
  });

  it('renders secondary variant', () => {
    render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
    expect(screen.getByTestId('badge')).toHaveClass('border-transparent', 'bg-secondary', 'text-secondary-foreground');
  });

  it('renders destructive variant', () => {
    render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>);
    expect(screen.getByTestId('badge')).toHaveClass('border-transparent', 'bg-destructive', 'text-destructive-foreground');
  });

  it('renders outline variant', () => {
    render(<Badge variant="outline" data-testid="badge">Outline</Badge>);
    expect(screen.getByTestId('badge')).toHaveClass('text-foreground');
  });

  it('accepts custom className', () => {
    render(<Badge className="custom-class" data-testid="badge">Badge</Badge>);
    expect(screen.getByTestId('badge')).toHaveClass('custom-class');
  });

  it('renders children correctly', () => {
    render(<Badge>Badge Text</Badge>);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });
});