import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup
} from '@/components/ui/context-menu';

describe('ContextMenu Components', () => {
  const renderContextMenu = () => {
    return render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button data-testid="trigger">Right click me</button>
        </ContextMenuTrigger>
        <ContextMenuContent data-testid="content">
          <ContextMenuItem data-testid="item1">Item 1</ContextMenuItem>
          <ContextMenuItem data-testid="item2">Item 2</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked data-testid="checkbox-item">
            Checkbox Item
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="option1">
            <ContextMenuRadioItem value="option1" data-testid="radio-item">
              Radio Item
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuLabel data-testid="label">Label</ContextMenuLabel>
          <ContextMenuItem>
            Item with shortcut
            <ContextMenuShortcut data-testid="shortcut">Ctrl+K</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  it('renders trigger correctly', () => {
    renderContextMenu();
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByText('Right click me')).toBeInTheDocument();
  });

  it('opens context menu on right click', async () => {
    renderContextMenu();
    
    const trigger = screen.getByTestId('trigger');
    fireEvent.contextMenu(trigger);
    
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('item1')).toBeInTheDocument();
    expect(screen.getByTestId('item2')).toBeInTheDocument();
  });

  describe('ContextMenuItem', () => {
    it('handles click events', async () => {
      const handleClick = vi.fn();
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleClick} data-testid="clickable-item">
              Clickable Item
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('clickable-item')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('clickable-item'));
      expect(handleClick).toHaveBeenCalled();
    });

    it('supports inset prop', async () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem inset data-testid="inset-item">
              Inset Item
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('inset-item')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('inset-item')).toHaveClass('pl-8');
    });
  });

  describe('ContextMenuCheckboxItem', () => {
    it('renders with checkbox functionality', async () => {
      const handleCheckedChange = vi.fn();
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem 
              checked={false}
              onCheckedChange={handleCheckedChange}
              data-testid="checkbox"
            >
              Checkbox
            </ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('checkbox')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('checkbox'));
      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('ContextMenuRadioItem', () => {
    it('renders within radio group', async () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value="option1">
              <ContextMenuRadioItem value="option1" data-testid="radio">
                Option 1
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('radio')).toBeInTheDocument();
      });
    });
  });

  describe('ContextMenuLabel', () => {
    it('renders label with correct styling', async () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuLabel data-testid="label">Menu Label</ContextMenuLabel>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('label')).toBeInTheDocument();
      });
      
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('px-2', 'py-1.5', 'text-sm', 'font-semibold');
    });
  });

  describe('ContextMenuSeparator', () => {
    it('renders separator', async () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
            <ContextMenuSeparator data-testid="separator" />
            <ContextMenuItem>Item 2</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('separator')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('separator')).toHaveClass('-mx-1', 'my-1', 'h-px', 'bg-border');
    });
  });

  describe('ContextMenuShortcut', () => {
    it('displays keyboard shortcut', async () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              Item
              <ContextMenuShortcut data-testid="shortcut">⌘K</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('shortcut')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('shortcut')).toHaveTextContent('⌘K');
    });
  });

  describe('ContextMenuSub', () => {
    it('renders submenu', async () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Trigger</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger data-testid="sub-trigger">
                More options
              </ContextMenuSubTrigger>
              <ContextMenuSubContent data-testid="sub-content">
                <ContextMenuItem>Sub item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      );
      
      fireEvent.contextMenu(screen.getByText('Trigger'));
      
      await waitFor(() => {
        expect(screen.getByTestId('sub-trigger')).toBeInTheDocument();
      });
    });
  });
});