import { render, screen, fireEvent } from '@testing-library/react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose
} from '@/components/ui/drawer';

describe('Drawer Components', () => {
  it('renders drawer trigger', () => {
    render(
      <Drawer>
        <DrawerTrigger asChild>
          <button>Open Drawer</button>
        </DrawerTrigger>
      </Drawer>
    );
    
    expect(screen.getByText('Open Drawer')).toBeInTheDocument();
  });

  it('opens drawer when trigger is clicked', () => {
    render(
      <Drawer>
        <DrawerTrigger asChild>
          <button>Open Drawer</button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Drawer Description</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <button>Action</button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
    
    fireEvent.click(screen.getByText('Open Drawer'));
    
    expect(screen.getByText('Drawer Title')).toBeInTheDocument();
    expect(screen.getByText('Drawer Description')).toBeInTheDocument();
  });

  it('renders drawer content with correct styling', () => {
    render(
      <Drawer open>
        <DrawerContent data-testid="drawer-content">
          <DrawerTitle>Test Drawer</DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
    
    const content = screen.getByTestId('drawer-content');
    expect(content).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0',
      'z-50',
      'mt-24',
      'flex',
      'h-auto',
      'flex-col',
      'rounded-t-[10px]',
      'border',
      'bg-background'
    );
  });

  it('renders drawer header with correct styling', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader data-testid="drawer-header">
            <DrawerTitle>Header Title</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
    
    const header = screen.getByTestId('drawer-header');
    expect(header).toHaveClass('grid', 'gap-1.5', 'p-4', 'text-center');
  });

  it('renders drawer footer with correct styling', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerFooter data-testid="drawer-footer">
            <button>Footer Button</button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
    
    const footer = screen.getByTestId('drawer-footer');
    expect(footer).toHaveClass('mt-auto', 'flex', 'flex-col', 'gap-2', 'p-4');
  });

  it('renders drawer title with correct styling', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle data-testid="drawer-title">Test Title</DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
    
    const title = screen.getByTestId('drawer-title');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'leading-none', 'tracking-tight');
  });

  it('renders drawer description with correct styling', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerDescription data-testid="drawer-description">
            Test description
          </DrawerDescription>
        </DrawerContent>
      </Drawer>
    );
    
    const description = screen.getByTestId('drawer-description');
    expect(description).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('handles close functionality', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Test</DrawerTitle>
          <DrawerClose asChild>
            <button data-testid="close-btn">Close</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
    );
    
    expect(screen.getByTestId('close-btn')).toBeInTheDocument();
  });

  it('supports shouldScaleBackground prop', () => {
    render(
      <Drawer shouldScaleBackground={false}>
        <DrawerTrigger>Open</DrawerTrigger>
      </Drawer>
    );
    
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});