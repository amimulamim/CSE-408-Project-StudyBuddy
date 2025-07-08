import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders with default styling', () => {
      render(<Alert data-testid="alert">Alert content</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
      expect(alert).toHaveAttribute('role', 'alert');
    });

    it('renders destructive variant', () => {
      render(<Alert variant="destructive" data-testid="alert">Alert</Alert>);
      expect(screen.getByTestId('alert')).toHaveClass('border-destructive/50', 'text-destructive');
    });

    it('accepts custom className', () => {
      render(<Alert className="custom-class" data-testid="alert">Alert</Alert>);
      expect(screen.getByTestId('alert')).toHaveClass('custom-class');
    });
  });

  describe('AlertTitle', () => {
    it('renders with correct styling', () => {
      render(<AlertTitle data-testid="alert-title">Alert Title</AlertTitle>);
      const title = screen.getByTestId('alert-title');
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
      expect(title).toHaveTextContent('Alert Title');
    });
  });

  describe('AlertDescription', () => {
    it('renders with correct styling', () => {
      render(<AlertDescription data-testid="alert-description">Description</AlertDescription>);
      const description = screen.getByTestId('alert-description');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveTextContent('Description');
    });
  });

  describe('Alert with icon', () => {
    it('renders with icon correctly', () => {
      render(
        <Alert data-testid="alert">
          <AlertCircle className="h-4 w-4" data-testid="alert-icon" />
          <AlertTitle>Alert with icon</AlertTitle>
          <AlertDescription>This alert has an icon</AlertDescription>
        </Alert>
      );
      
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      expect(screen.getByText('Alert with icon')).toBeInTheDocument();
      expect(screen.getByText('This alert has an icon')).toBeInTheDocument();
    });

    it('applies icon styling correctly', () => {
      render(
        <Alert>
          <CheckCircle className="h-4 w-4" data-testid="check-icon" />
          <AlertTitle>Success</AlertTitle>
        </Alert>
      );
      
      const icon = screen.getByTestId('check-icon');
      expect(icon).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Alert variants', () => {
    it('renders default variant correctly', () => {
      render(
        <Alert variant="default" data-testid="default-alert">
          <AlertTitle>Default Alert</AlertTitle>
        </Alert>
      );
      
      const alert = screen.getByTestId('default-alert');
      expect(alert).toHaveClass('bg-background', 'text-foreground');
    });

    it('renders destructive variant correctly', () => {
      render(
        <Alert variant="destructive" data-testid="destructive-alert">
          <AlertTitle>Destructive Alert</AlertTitle>
        </Alert>
      );
      
      const alert = screen.getByTestId('destructive-alert');
      expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
    });
  });
});