import { render, screen, waitFor } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Mock Radix Avatar to make it work in tests
vi.mock('@radix-ui/react-avatar', () => ({
  Root: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>{children}</span>
  ),
  Image: ({ className, src, alt, ...props }: any) => (
    <img className={className} src={src} alt={alt} {...props} />
  ),
  Fallback: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>{children}</span>
  ),
}));

describe('Avatar Components', () => {
  describe('Avatar', () => {
    it('renders with default styling', () => {
      render(<Avatar data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('relative', 'flex', 'h-10', 'w-10', 'shrink-0', 'overflow-hidden', 'rounded-full');
    });

    it('accepts custom className', () => {
      render(<Avatar className="custom-class" data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toHaveClass('custom-class');
    });
  });

  describe('AvatarImage', () => {
    it('renders image with correct attributes', () => {
      render(
        <Avatar>
          <AvatarImage src="/test-image.jpg" alt="Test User" data-testid="avatar-image" />
        </Avatar>
      );
      
      const image = screen.getByTestId('avatar-image');
      expect(image).toHaveAttribute('src', '/test-image.jpg');
      expect(image).toHaveAttribute('alt', 'Test User');
      expect(image).toHaveClass('aspect-square', 'h-full', 'w-full');
    });

    it('accepts custom className', () => {
      render(
        <Avatar>
          <AvatarImage className="custom-image" data-testid="avatar-image" src="/test.jpg" />
        </Avatar>
      );
      
      expect(screen.getByTestId('avatar-image')).toHaveClass('custom-image');
    });
  });

  describe('AvatarFallback', () => {
    it('renders fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
        </Avatar>
      );
      
      const fallback = screen.getByTestId('avatar-fallback');
      expect(fallback).toHaveTextContent('JD');
      expect(fallback).toHaveClass('flex', 'h-full', 'w-full', 'items-center', 'justify-center', 'rounded-full', 'bg-muted');
    });

    it('accepts custom className', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback" data-testid="avatar-fallback">
            AB
          </AvatarFallback>
        </Avatar>
      );
      
      expect(screen.getByTestId('avatar-fallback')).toHaveClass('custom-fallback');
    });
  });

  describe('Avatar with image and fallback', () => {
    it('renders both image and fallback', () => {
      render(
        <Avatar>
          <AvatarImage src="/test-image.jpg" alt="Test User" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      
      // Both should be present in the mocked version
      expect(screen.getByAltText('Test User')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('supports different sizes', () => {
      render(
        <Avatar className="h-16 w-16" data-testid="large-avatar">
          <AvatarFallback>XL</AvatarFallback>
        </Avatar>
      );
      
      expect(screen.getByTestId('large-avatar')).toHaveClass('h-16', 'w-16');
    });
  });
});