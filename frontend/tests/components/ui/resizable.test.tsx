import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

describe('Resizable', () => {
  test('renders resizable panel group', () => {
    render(
      <ResizablePanelGroup direction="horizontal" data-testid="panel-group">
        <ResizablePanel defaultSize={50} data-testid="panel-1">
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel defaultSize={50} data-testid="panel-2">
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )

    expect(screen.getByTestId('panel-group')).toBeInTheDocument()
    expect(screen.getByTestId('panel-1')).toBeInTheDocument()
    expect(screen.getByTestId('panel-2')).toBeInTheDocument()
    expect(screen.getByTestId('handle')).toBeInTheDocument()
    expect(screen.getByText('Panel 1')).toBeInTheDocument()
    expect(screen.getByText('Panel 2')).toBeInTheDocument()
  })

  test('renders vertical panel group', () => {
    render(
      <ResizablePanelGroup direction="vertical" data-testid="panel-group">
        <ResizablePanel defaultSize={30}>
          <div>Top Panel</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70}>
          <div>Bottom Panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )

    expect(screen.getByText('Top Panel')).toBeInTheDocument()
    expect(screen.getByText('Bottom Panel')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(
      <ResizablePanelGroup direction="horizontal" className="custom-group" data-testid="panel-group">
        <ResizablePanel className="custom-panel" data-testid="panel">
          <div>Panel Content</div>
        </ResizablePanel>
        <ResizableHandle className="custom-handle" data-testid="handle" />
        <ResizablePanel>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )

    const panelGroup = screen.getByTestId('panel-group')
    const panel = screen.getByTestId('panel')
    const handle = screen.getByTestId('handle')

    expect(panelGroup).toHaveClass('custom-group')
    expect(panel).toHaveClass('custom-panel')
    expect(handle).toHaveClass('custom-handle')
  })
})