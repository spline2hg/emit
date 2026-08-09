import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { LogFilters as ILogFilters, LogLevel } from '../types';

const LEVELS: (LogLevel | 'ALL')[] = ['ALL', 'INFO', 'ERROR', 'WARNING', 'DEBUG', 'CRITICAL'];

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, placeholder = 'Select date' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const newDate = `${year}-${month}-${dayStr}`;
    onChange(newDate);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent focus:outline-none"
      >
        <Calendar className="size-4 text-muted-foreground" />
        <span>{formatDate(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[280px] rounded-lg border border-border bg-popover p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded p-1 transition-colors hover:bg-accent"
            >
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
            <h3 className="text-sm font-medium text-foreground">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded p-1 transition-colors hover:bg-accent"
            >
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div key={day} className="py-1 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day && (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`flex h-full w-full items-center justify-center rounded text-sm transition-colors
                      ${
                        value ===
                        `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ query, onQueryChange }) => {
  return (
    <div className="relative max-w-2xl flex-grow group">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="size-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
      </div>
      <input
        type="text"
        className="block w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 leading-5 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
        placeholder="Search logs (message, trace ID, metadata)…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </div>
  );
};

interface LogFiltersProps {
  filters: ILogFilters;
  onFilterChange: (newFilters: ILogFilters) => void;
  availableServices: string[];
  right?: React.ReactNode;
}

export const LogFilters: React.FC<LogFiltersProps> = ({ filters, onFilterChange, availableServices, right }) => {
  const handleChange = (key: keyof ILogFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      query: '',
      level: 'ALL',
      service: 'ALL',
      startDate: '',
      endDate: '',
    });
  };

  const selectClass =
    'appearance-none block w-full rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm text-foreground cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm';

  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
        {/* Level Select */}
        <div className="relative min-w-[150px]">
          <select
            className={selectClass}
            value={filters.level}
            onChange={(e) => handleChange('level', e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === 'ALL' ? 'All levels' : l}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
            <Filter className="size-4" />
          </div>
        </div>

        {/* Service Select */}
        <div className="relative min-w-[170px]">
          <select
            className={selectClass}
            value={filters.service}
            onChange={(e) => handleChange('service', e.target.value)}
          >
            <option value="ALL">All services</option>
            {availableServices.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1 py-0.5 shadow-sm">
          <CustomDatePicker
            value={filters.startDate}
            onChange={(date) => handleChange('startDate', date)}
            placeholder="Start date"
          />
          <span className="text-muted-foreground">–</span>
          <CustomDatePicker
            value={filters.endDate}
            onChange={(date) => handleChange('endDate', date)}
            placeholder="End date"
          />
        </div>

        {/* Clear Button */}
        {(filters.query || filters.level !== 'ALL' || filters.service !== 'ALL' || filters.startDate) && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Clear filters"
          >
            <X className="size-4" />
            Clear
          </button>
        )}

        {/* Right slot (e.g. pagination) */}
        {right && <div className="ml-auto flex items-center">{right}</div>}
      </div>
    </div>
  );
};