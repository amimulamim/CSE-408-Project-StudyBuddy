import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
} from '@/components/ui/command';

// Mock cmdk to avoid scrollIntoView errors
vi.mock('cmdk', () => {
  const mockCommand = ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  );
  mockCommand.displayName = 'Command';

  const mockInput = ({ className, placeholder, onValueChange, ...props }: any) => (
    <input 
      className={className} 
      placeholder={placeholder}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    />
  );
  mockInput.displayName = 'Command.Input';

  const mockList = ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  );
  mockList.displayName = 'Command.List';

  const mockEmpty = ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  );
  mockEmpty.displayName = 'Command.Empty';

  const mockGroup = ({ children, className, heading, ...props }: any) => (
    <div className={className} {...props}>
      {heading && <div>{heading}</div>}
      {children}
    </div>
  );
  mockGroup.displayName = 'Command.Group';

  const mockItem = ({ children, className, onSelect, ...props }: any) => (
    <div 
      className={className} 
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  );
  mockItem.displayName = 'Command.Item';

  const mockSeparator = ({ className, ...props }: any) => (
    <div className={className} {...props} />
  );
  mockSeparator.displayName = 'Command.Separator';

  // Create the main Command object with nested components
  const CommandMock = Object.assign(mockCommand, {
    displayName: 'Command',
    Input: mockInput,
    List: mockList,
    Empty: mockEmpty,
    Group: mockGroup,
    Item: mockItem,
    Separator: mockSeparator,
  });

  return {
    Command: CommandMock,
  };
});

describe('Command Components', () => {
  describe('Command', () => {
    it('renders with default styling', () => {
      render(
        <Command data-testid="command">
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem>Item 1</CommandItem>
              <CommandItem>Item 2</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );
      
      const command = screen.getByTestId('command');
      expect(command).toBeInTheDocument();
      expect(command).toHaveClass('flex', 'h-full', 'w-full', 'flex-col', 'overflow-hidden', 'rounded-md');
    });

    it('supports shouldFilter prop', () => {
      render(
        <Command shouldFilter={false} data-testid="command">
          <CommandInput />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );
      
      expect(screen.getByTestId('command')).toBeInTheDocument();
    });
  });

  describe('CommandInput', () => {
    it('renders input with search icon', () => {
      render(
        <Command>
          <CommandInput placeholder="Search..." data-testid="command-input" />
        </Command>
      );
      
      const input = screen.getByTestId('command-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search...');
    });

    it('handles value changes', () => {
      const handleChange = vi.fn();
      render(
        <Command>
          <CommandInput onValueChange={handleChange} data-testid="command-input" />
        </Command>
      );
      
      const input = screen.getByTestId('command-input');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledWith('test');
    });
  });

  describe('CommandList', () => {
    it('renders command list', () => {
      render(
        <Command>
          <CommandList data-testid="command-list">
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      );
      
      expect(screen.getByTestId('command-list')).toBeInTheDocument();
    });
  });

  describe('CommandEmpty', () => {
    it('displays empty state', () => {
      render(
        <Command>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
          </CommandList>
        </Command>
      );
      
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  describe('CommandGroup', () => {
    it('renders group with heading', () => {
      render(
        <Command>
          <CommandList>
            <CommandGroup heading="Suggestions" data-testid="command-group">
              <CommandItem>Item 1</CommandItem>
              <CommandItem>Item 2</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );
      
      expect(screen.getByTestId('command-group')).toBeInTheDocument();
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });
  });

  describe('CommandItem', () => {
    it('renders command item', () => {
      render(
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem data-testid="command-item">Test Item</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );
      
      const item = screen.getByTestId('command-item');
      expect(item).toBeInTheDocument();
      expect(item).toHaveTextContent('Test Item');
    });

    it('handles selection', () => {
      const handleSelect = vi.fn();
      render(
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem onSelect={handleSelect} data-testid="command-item">
                Test Item
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );
      
      fireEvent.click(screen.getByTestId('command-item'));
      expect(handleSelect).toHaveBeenCalled();
    });
  });

  describe('CommandDialog', () => {
    it('renders dialog when open', () => {
      render(
        <CommandDialog open={true}>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
          </CommandList>
        </CommandDialog>
      );
      
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });

  describe('CommandShortcut', () => {
    it('renders keyboard shortcut', () => {
      render(
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem>
                Item
                <CommandShortcut data-testid="shortcut">Ctrl+K</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );
      
      expect(screen.getByTestId('shortcut')).toHaveTextContent('Ctrl+K');
    });
  });
});