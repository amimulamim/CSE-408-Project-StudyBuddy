import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';

describe('AlertDialog Components', () => {
  const renderAlertDialog = (defaultOpen = false) => {
    return render(
      <AlertDialog defaultOpen={defaultOpen}>
        <AlertDialogTrigger asChild>
          <button>Open Alert</button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alert Title</AlertDialogTitle>
            <AlertDialogDescription>
              This is an alert dialog description.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  it('renders trigger button', () => {
    renderAlertDialog();
    expect(screen.getByText('Open Alert')).toBeInTheDocument();
  });

  it('opens alert dialog when trigger is clicked', () => {
    renderAlertDialog();
    fireEvent.click(screen.getByText('Open Alert'));
    
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('This is an alert dialog description.')).toBeInTheDocument();
  });

  it('renders when defaultOpen is true', () => {
    renderAlertDialog(true);
    
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    renderAlertDialog(true);
    
    const content = screen.getByText('Alert Title').closest('[role="alertdialog"]');
    expect(content).toHaveClass('fixed', 'left-[50%]', 'top-[50%]', 'z-50');
  });

  it('handles action button clicks', () => {
    const handleAction = vi.fn();
    
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Test</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAction}>Action</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
    
    fireEvent.click(screen.getByText('Action'));
    expect(handleAction).toHaveBeenCalled();
  });

  it('renders header and footer with correct styling', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader data-testid="alert-header">
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter data-testid="alert-footer">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
    
    expect(screen.getByTestId('alert-header')).toHaveClass('flex', 'flex-col', 'space-y-2');
    expect(screen.getByTestId('alert-footer')).toHaveClass('flex', 'flex-col-reverse');
  });
});