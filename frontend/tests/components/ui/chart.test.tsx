import { render, screen } from '@testing-library/react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

describe('Chart Components', () => {
  describe('ChartContainer', () => {
    it('renders chart container', () => {
      const config = {
        desktop: {
          label: "Desktop",
          color: "#2563eb",
        },
      };
      
      render(
        <ChartContainer config={config} data-testid="chart-container">
          <div>Chart Content</div>
        </ChartContainer>
      );
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByText('Chart Content')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const config = {};
      render(
        <ChartContainer config={config} className="custom-chart" data-testid="chart-container">
          <div>Content</div>
        </ChartContainer>
      );
      expect(screen.getByTestId('chart-container')).toHaveClass('custom-chart');
    });
  });

  describe('ChartTooltip', () => {
    it('renders chart tooltip wrapper', () => {
      render(
        <div style={{ width: 400, height: 300 }}>
          <ChartTooltip />
        </div>
      );
      // ChartTooltip renders a recharts tooltip component
      expect(document.querySelector('.recharts-tooltip-wrapper')).toBeInTheDocument();
    });
  });

  describe('ChartTooltipContent', () => {
    it('renders tooltip content within chart container', () => {
      const config = {
        desktop: { label: "Desktop", color: "#2563eb" }
      };
      
      render(
        <ChartContainer config={config}>
          <ChartTooltipContent 
            data-testid="tooltip-content" 
            active={true}
            payload={[{ 
              value: 100, 
              name: 'test',
              dataKey: 'desktop',
              color: '#2563eb',
              payload: { fill: '#2563eb' }
            }]}
          />
        </ChartContainer>
      );
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });
  });

  describe('ChartLegend', () => {
    it('renders chart legend wrapper', () => {
      render(
        <div style={{ width: 400, height: 300 }}>
          <ChartLegend />
        </div>
      );
      // ChartLegend renders a recharts legend component
      expect(document.querySelector('.recharts-legend-wrapper')).toBeInTheDocument();
    });
  });

  describe('ChartLegendContent', () => {
    it('renders legend content within chart container', () => {
      const config = {
        desktop: { label: "Desktop", color: "#2563eb" }
      };
      
      const { container } = render(
        <ChartContainer config={config}>
          <ChartLegendContent 
            payload={[{ value: 'Desktop', color: '#2563eb', dataKey: 'desktop' }]}
          />
        </ChartContainer>
      );
      
      // Check that legend content is rendered by looking for the legend item
      expect(container.querySelector('.flex.items-center.gap-1\\.5')).toBeInTheDocument();
    });
  });
});