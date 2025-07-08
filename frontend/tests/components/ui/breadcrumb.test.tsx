import { render, screen } from '@testing-library/react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

describe('Breadcrumb Components', () => {
  describe('Breadcrumb', () => {
    it('renders breadcrumb navigation', () => {
      render(
        <Breadcrumb data-testid="breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbList', () => {
    it('renders breadcrumb list', () => {
      render(
        <BreadcrumbList data-testid="breadcrumb-list">
          <BreadcrumbItem>Item</BreadcrumbItem>
        </BreadcrumbList>
      );
      expect(screen.getByTestId('breadcrumb-list')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbItem', () => {
    it('renders breadcrumb item', () => {
      render(<BreadcrumbItem data-testid="breadcrumb-item">Item</BreadcrumbItem>);
      expect(screen.getByTestId('breadcrumb-item')).toBeInTheDocument();
      expect(screen.getByText('Item')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbLink', () => {
    it('renders breadcrumb link', () => {
      render(<BreadcrumbLink href="/test" data-testid="breadcrumb-link">Link</BreadcrumbLink>);
      const link = screen.getByTestId('breadcrumb-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(screen.getByText('Link')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbPage', () => {
    it('renders current page', () => {
      render(<BreadcrumbPage data-testid="breadcrumb-page">Current Page</BreadcrumbPage>);
      expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbSeparator', () => {
    it('renders separator', () => {
      render(<BreadcrumbSeparator data-testid="breadcrumb-separator" />);
      expect(screen.getByTestId('breadcrumb-separator')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbEllipsis', () => {
    it('renders ellipsis', () => {
      render(<BreadcrumbEllipsis data-testid="breadcrumb-ellipsis" />);
      expect(screen.getByTestId('breadcrumb-ellipsis')).toBeInTheDocument();
    });
  });
});