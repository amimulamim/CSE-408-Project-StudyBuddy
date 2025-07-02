import { render, screen } from '@testing-library/react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

describe('AspectRatio', () => {
  it('renders with default ratio', () => {
    render(
      <AspectRatio data-testid="aspect-ratio">
        <div>Content</div>
      </AspectRatio>
    );
    const aspectRatio = screen.getByTestId('aspect-ratio');
    expect(aspectRatio).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('accepts custom ratio', () => {
    render(
      <AspectRatio ratio={16 / 9} data-testid="aspect-ratio">
        <div>16:9 Content</div>
      </AspectRatio>
    );
    const aspectRatio = screen.getByTestId('aspect-ratio');
    expect(aspectRatio).toBeInTheDocument();
    expect(screen.getByText('16:9 Content')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(
      <AspectRatio className="custom-class" data-testid="aspect-ratio">
        <div>Content</div>
      </AspectRatio>
    );
    expect(screen.getByTestId('aspect-ratio')).toHaveClass('custom-class');
  });
});