"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { type KeyboardEvent, useRef, useState } from "react";
import Input from "~/components/ui/input";

export type TemplateInputProps = {
  id: string,
  value: string,
  onChange: (value: string) => void,
  /** The placeholders that are suggested after a `{` */
  suggestions: string[],
  placeholder?: string,
  disabled?: boolean,
};

/** The placeholder that is being typed before the caret, e.g. `{en` */
function getOpenPlaceholder(value: string, caret: number) {
  const match = (/\{[^{}]*$/).exec(value.slice(0, caret));
  return match ? { start: match.index, text: match[0] } : null;
}

const TemplateInput = ({ id, value, onChange, suggestions, placeholder, disabled }: TemplateInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const open = caret === null ? null : getOpenPlaceholder(value, caret);
  const matches = open
    ? suggestions.filter(suggestion => suggestion.startsWith(open.text) && suggestion !== open.text)
    : [];
  const listId = `${id}-suggestions`;

  const updateCaret = () => setCaret(inputRef.current?.selectionStart ?? null);

  const insert = (suggestion: string) => {
    if (!open || caret === null) return;
    // A closing brace that is already there is replaced too
    const end = value[caret] === "}" ? caret + 1 : caret;
    const next = value.slice(0, open.start) + suggestion + value.slice(end);
    const nextCaret = open.start + suggestion.length;
    onChange(next);
    setCaret(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (matches.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((activeIndex + step + matches.length) % matches.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insert(matches[Math.min(activeIndex, matches.length - 1)]);
    } else if (event.key === "Escape") {
      setCaret(null);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        size="sm"
        autoComplete="off"
        spellCheck={false}
        className="font-mono text-xs"
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={event => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={updateCaret}
        onClick={updateCaret}
        onBlur={() => setCaret(null)}
        disabled={disabled}
      />
      {matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg"
        >
          {matches.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === activeIndex}
              // Keeps the focus in the input
              onMouseDown={event => {
                event.preventDefault();
                insert(suggestion);
              }}
              className={cn(
                "cursor-pointer px-3 py-1 font-mono text-xs text-slate-300",
                index === activeIndex && "bg-slate-800 text-slate-100",
              )}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TemplateInput;
