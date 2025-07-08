import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarShortcut,
} from '@/components/ui/menubar'

// Mock Radix UI Menubar
vi.mock(import("@radix-ui/react-menubar"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Root: ({ children, className }: any) => (
        <div className={className} role="menubar" data-testid="menubar">
        {children}
        </div>
    ),
    Menu: ({ children }: any) => {
        const [isOpen, setIsOpen] = React.useState(false)
        return (
        <div data-testid="menubar-menu">
            {React.Children.map(children, (child) =>
            React.cloneElement(child, { isOpen, setIsOpen })
            )}
        </div>
        )
    },
    Trigger: ({ children, className, isOpen, setIsOpen }: any) => (
        <button
        className={className}
        onClick={() => setIsOpen && setIsOpen(!isOpen)}
        data-state={isOpen ? 'open' : 'closed'}
        role="menuitem"
        >
        {children}
        </button>
    ),
    Portal: ({ children }: any) => children,
    Content: ({ children, className, isOpen }: any) => (
        isOpen ? (
        <div className={className} data-testid="menubar-content">
            {children}
        </div>
        ) : null
    ),
    Item: ({ children, className }: any) => (
        <div className={className} role="menuitem" data-testid="menubar-item">
        {children}
        </div>
    ),
    CheckboxItem: ({ children, className }: any) => (
        <div className={className} role="menuitemcheckbox" data-testid="menubar-checkbox-item">
        {children}
        </div>
    ),
    RadioGroup: ({ children, className }: any) => (
        <div className={className} role="group" data-testid="menubar-radio-group">
        {children}
        </div>
    ),
    RadioItem: ({ children, className }: any) => (
        <div className={className} role="menuitemradio" data-testid="menubar-radio-item">
        {children}
        </div>
    ),
    Label: ({ children, className }: any) => (
        <div className={className} data-testid="menubar-label">
        {children}
        </div>
    ),
    Separator: ({ className }: any) => (
        <div className={className} role="separator" data-testid="menubar-separator" />
    ),
    Sub: ({ children }: any) => children,
    SubTrigger: ({ children, className }: any) => (
        <div className={className} data-testid="menubar-sub-trigger">
        {children}
        </div>
    ),
    SubContent: ({ children, className }: any) => (
        <div className={className} data-testid="menubar-sub-content">
        {children}
        </div>
    )
  }
})

describe('Menubar', () => {
  test('renders menubar with menu items', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New File</MenubarItem>
            <MenubarItem>Open File</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Exit</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )

    expect(screen.getByText('File')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  test('opens menu content when trigger is clicked', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New File</MenubarItem>
            <MenubarItem>Open File</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )

    fireEvent.click(screen.getByText('File'))
    expect(screen.getByText('New File')).toBeInTheDocument()
    expect(screen.getByText('Open File')).toBeInTheDocument()
  })

  test('renders checkbox items', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked>Show Toolbar</MenubarCheckboxItem>
            <MenubarCheckboxItem>Show Sidebar</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )

    fireEvent.click(screen.getByText('View'))
    expect(screen.getByText('Show Toolbar')).toBeInTheDocument()
    expect(screen.getByText('Show Sidebar')).toBeInTheDocument()
  })

  test('renders radio group items', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value="light">
              <MenubarRadioItem value="light">Light</MenubarRadioItem>
              <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )

    fireEvent.click(screen.getByText('Theme'))
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  test('renders shortcuts', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New File
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )

    fireEvent.click(screen.getByText('File'))
    expect(screen.getByText('⌘N')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(
      <Menubar className="custom-menubar">
        <MenubarMenu>
          <MenubarTrigger className="custom-trigger">File</MenubarTrigger>
        </MenubarMenu>
      </Menubar>
    )

    const menubar = screen.getByRole('menubar')
    expect(menubar).toHaveClass('custom-menubar')
  })

  test('renders separators and labels', () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarLabel>Recent Files</MenubarLabel>
            <MenubarItem>File 1</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Exit</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )

    fireEvent.click(screen.getByText('File'))
    expect(screen.getByText('Recent Files')).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })
})