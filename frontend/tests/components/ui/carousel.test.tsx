import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

describe('Carousel Components', () => {
  describe('Carousel', () => {
    it('renders carousel container', () => {
      render(
        <Carousel data-testid="carousel">
          <CarouselContent>
            <CarouselItem>Item 1</CarouselItem>
          </CarouselContent>
        </Carousel>
      );
      expect(screen.getByTestId('carousel')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      render(
        <Carousel className="custom-carousel" data-testid="carousel">
          <CarouselContent>
            <CarouselItem>Item</CarouselItem>
          </CarouselContent>
        </Carousel>
      );
      expect(screen.getByTestId('carousel')).toHaveClass('custom-carousel');
    });
  });

  describe('CarouselContent', () => {
    it('renders carousel content', () => {
      render(
        <Carousel>
          <CarouselContent data-testid="carousel-content">
            <CarouselItem>Content</CarouselItem>
          </CarouselContent>
        </Carousel>
      );
      expect(screen.getByTestId('carousel-content')).toBeInTheDocument();
    });
  });

  describe('CarouselItem', () => {
    it('renders carousel item', () => {
      render(
        <Carousel>
          <CarouselContent>
            <CarouselItem data-testid="carousel-item">Item Content</CarouselItem>
          </CarouselContent>
        </Carousel>
      );
      expect(screen.getByTestId('carousel-item')).toBeInTheDocument();
      expect(screen.getByText('Item Content')).toBeInTheDocument();
    });
  });

  describe('CarouselPrevious', () => {
    it('renders previous button', () => {
      render(
        <Carousel>
          <CarouselContent>
            <CarouselItem>Item</CarouselItem>
          </CarouselContent>
          <CarouselPrevious data-testid="carousel-previous" />
        </Carousel>
      );
      expect(screen.getByTestId('carousel-previous')).toBeInTheDocument();
    });

    it('can be clicked', () => {
      render(
        <Carousel>
          <CarouselContent>
            <CarouselItem>Item 1</CarouselItem>
            <CarouselItem>Item 2</CarouselItem>
          </CarouselContent>
          <CarouselPrevious data-testid="carousel-previous" />
        </Carousel>
      );
      
      const button = screen.getByTestId('carousel-previous');
      fireEvent.click(button);
      // Test that the button exists and is clickable (doesn't throw error)
      expect(button).toBeInTheDocument();
    });
  });

  describe('CarouselNext', () => {
    it('renders next button', () => {
      render(
        <Carousel>
          <CarouselContent>
            <CarouselItem>Item</CarouselItem>
          </CarouselContent>
          <CarouselNext data-testid="carousel-next" />
        </Carousel>
      );
      expect(screen.getByTestId('carousel-next')).toBeInTheDocument();
    });

    it('can be clicked', () => {
      render(
        <Carousel>
          <CarouselContent>
            <CarouselItem>Item 1</CarouselItem>
            <CarouselItem>Item 2</CarouselItem>
          </CarouselContent>
          <CarouselNext data-testid="carousel-next" />
        </Carousel>
      );
      
      const button = screen.getByTestId('carousel-next');
      fireEvent.click(button);
      // Test that the button exists and is clickable (doesn't throw error)
      expect(button).toBeInTheDocument();
    });
  });
});