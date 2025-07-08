import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

describe('Accordion Components', () => {
  const renderAccordion = (type: 'single' | 'multiple' = 'single', collapsible = true) => {
    return render(
      <Accordion type={type} collapsible={collapsible}>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  it('renders accordion items correctly', () => {
    renderAccordion();
    
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
  });

  it('shows content when trigger is clicked', () => {
    renderAccordion();
    
    const trigger1 = screen.getByText('Section 1');
    fireEvent.click(trigger1);
    
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('collapses content when trigger is clicked again', () => {
    renderAccordion();
    
    const trigger1 = screen.getByText('Section 1');
    
    // Open
    fireEvent.click(trigger1);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    
    // Close
    fireEvent.click(trigger1);
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(
      <Accordion type="single" data-testid="accordion">
        <AccordionItem value="item-1" data-testid="accordion-item">
          <AccordionTrigger data-testid="accordion-trigger">Test</AccordionTrigger>
          <AccordionContent data-testid="accordion-content">Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    const item = screen.getByTestId('accordion-item');
    expect(item).toHaveClass('border-b');
  });

  it('supports multiple open items when type is multiple', () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    
    fireEvent.click(screen.getByText('Section 1'));
    fireEvent.click(screen.getByText('Section 2'));
    
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });
});