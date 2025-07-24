import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick a date range",
  className,
  disabled = false
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleClearDateRange = () => {
    onDateRangeChange({ from: undefined, to: undefined });
    setTempDateRange({ from: undefined, to: undefined });
    setIsOpen(false);
  };

  const handleDateSelect = (range: any) => {
    setTempDateRange({
      from: range?.from,
      to: range?.to,
    });
  };

  const handleApply = () => {
    onDateRangeChange(tempDateRange);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Initialize temp range with current date range when opening
      setTempDateRange(dateRange);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !dateRange.from && !dateRange.to && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "LLL dd, y")} -{" "}
                {format(dateRange.to, "LLL dd, y")}
              </>
            ) : (
              format(dateRange.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={tempDateRange.from || dateRange.from}
          selected={{
            from: tempDateRange.from,
            to: tempDateRange.to,
          }}
          onSelect={handleDateSelect}
          numberOfMonths={2}
        />
        <div className="p-3 border-t space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={handleApply}
            disabled={!tempDateRange.from && !tempDateRange.to}
          >
            Apply Date Range
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleClearDateRange}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Date Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
