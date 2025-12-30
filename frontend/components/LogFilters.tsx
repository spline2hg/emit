import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { LogFilters as ILogFilters, LogLevel } from '../types';

const LEVELS: (LogLevel | 'ALL')[] = ['ALL', 'INFO', 'ERROR', 'WARNING', 'DEBUG', 'CRITICAL'];

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, placeholder = "Select date" }) => {
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

    const days = [];
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
        className="flex items-center gap-2 px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <Calendar className="h-4 w-4" />
        <span>{formatDate(value)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day && (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`w-full h-full flex items-center justify-center text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                      ${value === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        ? 'bg-brand-500 text-white hover:bg-brand-600'
                        : 'text-gray-700 dark:text-gray-300'
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
    <div className="relative flex-grow max-w-2xl group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all"
        placeholder="Search logs (message, trace ID, metadata)..."
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
}

export const LogFilters: React.FC<LogFiltersProps> = ({ filters, onFilterChange, availableServices }) => {

  const handleChange = (key: keyof ILogFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      query: '',
      level: 'ALL',
      service: 'ALL',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border p-4 shadow-sm transition-colors duration-200">
      <div className="flex flex-wrap items-center gap-3">

        {/* Level Select */}
        <div className="relative min-w-[120px]">
          <select
            className="appearance-none block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm cursor-pointer"
            value={filters.level}
            onChange={(e) => handleChange('level', e.target.value)}
          >
            {LEVELS.map(l => <option key={l} value={l}>{l === 'ALL' ? 'All Levels' : l}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <Filter className="h-4 w-4" />
          </div>
        </div>

        {/* Service Select */}
        <div className="relative min-w-[150px]">
          <select
            className="appearance-none block w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm cursor-pointer"
            value={filters.service}
            onChange={(e) => handleChange('service', e.target.value)}
          >
            <option value="ALL">All Services</option>
            {availableServices.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-600 p-1">
           <CustomDatePicker
              value={filters.startDate}
              onChange={(date) => handleChange('startDate', date)}
              placeholder="Start date"
           />
           <span className="text-gray-500 dark:text-gray-400">-</span>
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
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="Clear Filters"
           >
              <X className="h-5 w-5" />
           </button>
        )}

      </div>
    </div>
  );
};
