import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';

describe('Dialog Components', () => {
  it('renders dialog trigger', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
      </Dialog>
    );
    
    expect(screen.getByText('Open Dialog')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button>Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    
    fireEvent.click(screen.getByText('Open Dialog'));
    
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog Description')).toBeInTheDocument();
  });

  it('renders dialog content with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    
    const content = screen.getByTestId('dialog-content');
    expect(content).toHaveClass(
      'fixed',
      'left-[50%]',
      'top-[50%]',
      'z-50',
      'grid',
      'w-full',
      'max-w-lg',
      'translate-x-[-50%]',
      'translate-y-[-50%]',
      'gap-4',
      'border',
      'bg-background',
      'p-6',
      'shadow-lg',
      'duration-200'
    );
  });

  it('renders dialog header with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader data-testid="dialog-header">
            <DialogTitle>Header Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    
    const header = screen.getByTestId('dialog-header');
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'text-center');
  });

  it('renders dialog footer with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter data-testid="dialog-footer">
            <button>Footer Button</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    
    const footer = screen.getByTestId('dialog-footer');
    expect(footer).toHaveClass('flex', 'flex-col-reverse');
  });

  it('handles close button', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
          <DialogClose asChild>
            <button data-testid="close-btn">Close</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
    
    expect(screen.getByTestId('close-btn')).toBeInTheDocument();
  });

  it('supports controlled open state', () => {
    const { rerender } = render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Hidden Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    
    expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument();
    
    rerender(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Visible Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    
    expect(screen.getByText('Visible Dialog')).toBeInTheDocument();
  });
});