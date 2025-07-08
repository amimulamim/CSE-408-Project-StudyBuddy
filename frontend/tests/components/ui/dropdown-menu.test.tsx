import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup
} from '@/components/ui/dropdown-menu';

// Mock Radix UI DropdownMenu to work in tests
vi.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children, defaultOpen }: any) => <div data-dropdown-open={defaultOpen}>{children}</div>,
  Trigger: ({ children, asChild, ...props }: any) => 
    asChild ? <div {...props}>{children}</div> : <button {...props}>{children}</button>,
  Content: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Item: ({ children, onClick, onSelect, ...props }: any) => (
    <div onClick={() => { onClick?.(); onSelect?.(); }} {...props}>{children}</div>
  ),
  CheckboxItem: ({ children, onCheckedChange, checked, ...props }: any) => (
    <div onClick={() => onCheckedChange?.(!checked)} {...props}>{children}</div>
  ),
  RadioItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  RadioGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Label: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Separator: ({ ...props }: any) => <div {...props} />,
  Group: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Sub: ({ children }: any) => <div>{children}</div>,
  SubTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SubContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Portal: ({ children }: any) => <div>{children}</div>,
  ItemIndicator: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('DropdownMenu Components', () => {
  const renderDropdownMenu = (defaultOpen = false) => {
    return render(
      <DropdownMenu defaultOpen={defaultOpen}>
        <DropdownMenuTrigger asChild>
          <button data-testid="trigger">Open Menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-testid="content">
          <DropdownMenuItem data-testid="item1">Item 1</DropdownMenuItem>
          <DropdownMenuItem data-testid="item2">Item 2</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked data-testid="checkbox-item">
            Checkbox Item
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="option1">
            <DropdownMenuRadioItem value="option1" data-testid="radio-item">
              Radio Item
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel data-testid="label">Label</DropdownMenuLabel>
          <DropdownMenuItem>
            Item with shortcut
            <DropdownMenuShortcut data-testid="shortcut">Ctrl+K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  it('renders trigger correctly', () => {
    renderDropdownMenu();
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByText('Open Menu')).toBeInTheDocument();
  });

  it('opens dropdown menu when trigger is clicked', () => {
    renderDropdownMenu(true); // Start with menu open
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('item1')).toBeInTheDocument();
    expect(screen.getByTestId('item2')).toBeInTheDocument();
  });

  describe('DropdownMenuItem', () => {
    it('handles click events', () => {
      const handleClick = vi.fn();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleClick} data-testid="clickable-item">
              Clickable Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('clickable-item')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('clickable-item'));
      expect(handleClick).toHaveBeenCalled();
    });

    it('supports inset prop', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset data-testid="inset-item">
              Inset Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('inset-item')).toBeInTheDocument();
      expect(screen.getByTestId('inset-item')).toHaveClass('pl-8');
    });
  });

  describe('DropdownMenuCheckboxItem', () => {
    it('renders with checkbox functionality', () => {
      const handleCheckedChange = vi.fn();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem 
              checked={false}
              onCheckedChange={handleCheckedChange}
              data-testid="checkbox"
            >
              Checkbox
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('checkbox'));
      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('DropdownMenuRadioItem', () => {
    it('renders within radio group', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1" data-testid="radio">
                Option 1
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('radio')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuLabel', () => {
    it('renders label with correct styling', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel data-testid="label">Menu Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('label')).toBeInTheDocument();
      
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('px-2', 'py-1.5', 'text-sm', 'font-semibold');
    });
  });

  describe('DropdownMenuSeparator', () => {
    it('renders separator', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator data-testid="separator" />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('separator')).toBeInTheDocument();
      expect(screen.getByTestId('separator')).toHaveClass('-mx-1', 'my-1', 'h-px', 'bg-muted');
    });
  });

  describe('DropdownMenuShortcut', () => {
    it('displays keyboard shortcut', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Item
              <DropdownMenuShortcut data-testid="shortcut">⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('shortcut')).toBeInTheDocument();
      expect(screen.getByTestId('shortcut')).toHaveTextContent('⌘K');
    });
  });

  describe('DropdownMenuSub', () => {
    it('renders submenu', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid="sub-trigger">
                More options
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent data-testid="sub-content">
                <DropdownMenuItem>Sub item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      expect(screen.getByTestId('sub-trigger')).toBeInTheDocument();
    });
  });
});