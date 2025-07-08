import { render, screen, fireEvent } from '@testing-library/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

describe('Collapsible Components', () => {
  describe('Collapsible', () => {
    it('renders collapsible container', () => {
      render(
        <Collapsible data-testid="collapsible">
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );
      expect(screen.getByTestId('collapsible')).toBeInTheDocument();
      expect(screen.getByText('Toggle')).toBeInTheDocument();
    });

    it('accepts open prop', () => {
      render(
        <Collapsible open={true} data-testid="collapsible">
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles onOpenChange', () => {
      const onOpenChange = vi.fn();
      render(
        <Collapsible onOpenChange={onOpenChange} data-testid="collapsible">
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );
      
      fireEvent.click(screen.getByText('Toggle'));
      expect(onOpenChange).toHaveBeenCalled();
    });
  });

  describe('CollapsibleTrigger', () => {
    it('renders trigger button', () => {
      render(
        <Collapsible>
          <CollapsibleTrigger data-testid="collapsible-trigger">Trigger</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );
      expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument();
      expect(screen.getByText('Trigger')).toBeInTheDocument();
    });
  });

  describe('CollapsibleContent', () => {
    it('renders content', () => {
      render(
        <Collapsible open={true}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsibleContent data-testid="collapsible-content">Content</CollapsibleContent>
        </Collapsible>
      );
      expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});