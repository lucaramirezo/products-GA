import React, { useState, useRef, useCallback } from 'react';

// CommitTextInput Component
interface CommitTextInputProps {
  value: string;
  onCommit: (newValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function CommitTextInput({
  value,
  onCommit,
  disabled = false,
  placeholder,
  maxLength,
  className = "w-full rounded border border-slate-300 px-3 py-2"
}: CommitTextInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isComposing, setIsComposing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const originalValueRef = useRef(value);

  // Update local state when external value changes
  React.useEffect(() => {
    setLocalValue(value);
    originalValueRef.current = value;
  }, [value]);

  const commitValue = useCallback(async () => {
    if (isSaving || isComposing || localValue === originalValueRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      await onCommit(localValue);
      originalValueRef.current = localValue;
    } catch (error) {
      // On error, revert to original value
      setLocalValue(originalValueRef.current);
      console.error('Failed to commit value:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localValue, onCommit, isSaving, isComposing]);

  const handleBlur = () => {
    if (!isComposing) {
      commitValue();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(originalValueRef.current);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <input
      type="text"
      className={className}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      disabled={disabled || isSaving}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

// CommitNumberInput Component
interface CommitNumberInputProps {
  value: number | null | undefined;
  onCommit: (newValue: number | null | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  parse?: (value: string) => number | null | undefined;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CommitNumberInput({
  value,
  onCommit,
  step,
  min,
  max,
  format,
  parse,
  disabled = false,
  placeholder,
  className = "w-full rounded border border-slate-300 px-3 py-2"
}: CommitNumberInputProps) {
  const [localValue, setLocalValue] = useState(() => 
    value !== null && value !== undefined ? 
      (format ? format(value) : value.toString()) : 
      ""
  );
  const [isComposing, setIsComposing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const originalValueRef = useRef(value);

  // Update local state when external value changes
  React.useEffect(() => {
    const newLocalValue = value !== null && value !== undefined ? 
      (format ? format(value) : value.toString()) : 
      "";
    setLocalValue(newLocalValue);
    originalValueRef.current = value;
  }, [value, format]);

  const commitValue = useCallback(async () => {
    if (isSaving || isComposing) {
      return;
    }

    let parsedValue: number | null | undefined;
    
    if (localValue.trim() === "") {
      parsedValue = undefined;
    } else {
      if (parse) {
        parsedValue = parse(localValue);
      } else {
        const parsed = parseFloat(localValue);
        parsedValue = isNaN(parsed) ? null : parsed;
      }
      
      // Validate range if specified
      if (parsedValue !== null && parsedValue !== undefined) {
        if (min !== undefined && parsedValue < min) {
          parsedValue = min;
        }
        if (max !== undefined && parsedValue > max) {
          parsedValue = max;
        }
      }
    }

    // Only commit if value actually changed
    if (parsedValue !== originalValueRef.current) {
      setIsSaving(true);
      try {
        await onCommit(parsedValue);
        originalValueRef.current = parsedValue;
        // Update local display with the committed value
        if (parsedValue !== null && parsedValue !== undefined) {
          setLocalValue(format ? format(parsedValue) : parsedValue.toString());
        }
      } catch (error) {
        // On error, revert to original value
        const revertValue = originalValueRef.current !== null && originalValueRef.current !== undefined ? 
          (format ? format(originalValueRef.current) : originalValueRef.current.toString()) : 
          "";
        setLocalValue(revertValue);
        console.error('Failed to commit number value:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [localValue, onCommit, isSaving, isComposing, parse, format, min, max]);

  const handleBlur = () => {
    if (!isComposing) {
      commitValue();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const revertValue = originalValueRef.current !== null && originalValueRef.current !== undefined ? 
        (format ? format(originalValueRef.current) : originalValueRef.current.toString()) : 
        "";
      setLocalValue(revertValue);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <input
      type="number"
      className={className}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      disabled={disabled || isSaving}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
    />
  );
}
