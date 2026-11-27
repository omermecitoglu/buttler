"use client";

import { Toast } from "@base-ui/react/toast";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faClipboard } from "@fortawesome/free-solid-svg-icons/faClipboard";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";
import { faLockOpen } from "@fortawesome/free-solid-svg-icons/faLockOpen";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { type ClipboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import Select from "~/components/ui/select";
import Textarea from "~/components/ui/textarea";
import { type EnvironmentVariableScope, environmentVariableScopes } from "~/core/environment-variables";
import { parseEnvVariables } from "~/utils/parseEnvVariables";
import { stringifyEnvVariables } from "~/utils/stringifyEnvVariables";

export type EnvironmentVariableItem = {
  id?: string,
  key: string,
  value: string,
  scope: EnvironmentVariableScope,
  isSecret: boolean,
  /** Key of the saved secret, which is kept if a new value is not entered */
  savedSecretKey?: string,
  /** Whether the value is edited in a textarea, which is turned on when lines are pasted into it */
  isMultiline?: boolean,
  /** Shown under the variable, e.g. where it comes from */
  note?: string,
};

export type EnvironmentVariablesRepeaterLabels = {
  title?: string,
  description?: string,
  addButton?: string,
  copyButton?: string,
  copiedButton?: string,
  clearButton?: string,
  pasteButton?: string,
  pasteInvalidMessage?: string,
  pasteFailedMessage?: string,
  removeButton?: string,
  keyLabel?: string,
  keyPlaceholder?: string,
  valueLabel?: string,
  valuePlaceholder?: string,
  scopeLabel?: string,
  scopes?: Record<EnvironmentVariableScope, string>,
  scopeHelp?: string,
  secretLabel?: string,
  savedSecretPlaceholder?: string,
  emptyMessage?: string,
};

export type EnvironmentVariablesRepeaterProps = {
  items?: EnvironmentVariableItem[],
  onChange?: (items: EnvironmentVariableItem[]) => void,
  disabled?: boolean,
  /** Whether the service has a build step, which the variables can be used in */
  hasBuild?: boolean,
  labels?: EnvironmentVariablesRepeaterLabels,
  className?: string,
};

const createEmptyVariable = (): EnvironmentVariableItem => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(),
  key: "",
  value: "",
  scope: "runtime",
  isSecret: false,
});

const createPastedVariable = ([key, value]: [string, string]): EnvironmentVariableItem => ({
  ...createEmptyVariable(),
  key,
  value,
  isMultiline: value.includes("\n"),
});

/** Whether the clipboard has .env text, which can only be known if reading it is allowed */
type ClipboardContent = "unknown" | "env" | "other";

async function readClipboardContent(): Promise<ClipboardContent> {
  try {
    const permission = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    if (permission.state !== "granted") return "unknown";
    const text = await navigator.clipboard.readText();
    return parseEnvVariables(text) ? "env" : "other";
  } catch {
    // Browsers that do not know the permission cannot read the clipboard without a click
    return "unknown";
  }
}

const EnvironmentVariablesRepeater = ({
  items: controlledItems,
  onChange,
  disabled = false,
  hasBuild = true,
  labels,
  className,
}: EnvironmentVariablesRepeaterProps) => {
  const [internalItems, setInternalItems] = useState<EnvironmentVariableItem[]>(controlledItems ?? []);

  useEffect(() => {
    if (controlledItems !== undefined) {
      setInternalItems(controlledItems);
    }
  }, [controlledItems]);

  const toastManager = Toast.useToastManager();
  const [copied, setCopied] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<ClipboardContent>("unknown");
  const isEmpty = internalItems.length === 0;
  /** The value field to focus once it has turned into a textarea */
  const pendingFocus = useRef<{ index: number, caret: number } | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!isEmpty) return;
    let cancelled = false;
    const check = () => {
      void readClipboardContent().then(content => {
        if (!cancelled) setClipboardContent(content);
      });
    };
    check();
    // The clipboard can change while the user is in another window
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
    };
  }, [isEmpty]);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const { index, caret } = pendingFocus.current;
    pendingFocus.current = null;
    const element = document.getElementById(`env-val-${index}`);
    if (element instanceof HTMLTextAreaElement) {
      element.focus();
      element.setSelectionRange(caret, caret);
    }
  });

  const updateItems = (nextItems: EnvironmentVariableItem[]) => {
    setInternalItems(nextItems);
    onChange?.(nextItems);
  };

  const handleAdd = () => {
    updateItems([...internalItems, createEmptyVariable()]);
  };

  const handleRemove = (indexToRemove: number) => {
    updateItems(internalItems.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChange = (index: number, changes: Partial<Omit<EnvironmentVariableItem, "id">>) => {
    const next = internalItems.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        ...changes,
      };
    });
    updateItems(next);
  };

  const pasteVariables = (index: number, pasted: Record<string, string>) => {
    const remaining = new Map(Object.entries(pasted));
    const next = internalItems.map(item => {
      const key = item.key.trim();
      const value = remaining.get(key);
      if (value === undefined) return item;
      remaining.delete(key);
      return {
        ...item,
        value,
        isMultiline: item.isMultiline === true || value.includes("\n"),
      };
    });
    const added = Array.from(remaining, createPastedVariable);
    const current = internalItems[index];
    const isBlank = current.key.trim() === "" && current.value === "";
    // A blank row is replaced by the pasted variables, other rows are followed by them
    next.splice(isBlank ? index : index + 1, isBlank ? 1 : 0, ...added);
    updateItems(next);
  };

  const handlePaste = (
    index: number,
    field: "key" | "value",
    event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const text = event.clipboardData.getData("text/plain");
    const pasted = parseEnvVariables(text);
    if (pasted) {
      event.preventDefault();
      pasteVariables(index, pasted);
      return;
    }
    const item = internalItems[index];
    if (field !== "value" || item.isMultiline || !(/[\r\n]/).test(text)) return;
    // Inputs drop line breaks, so the pasted lines turn the value field into a textarea
    event.preventDefault();
    const lines = text.replace(/\r\n?/g, "\n");
    const start = event.currentTarget.selectionStart ?? item.value.length;
    const end = event.currentTarget.selectionEnd ?? start;
    pendingFocus.current = { index, caret: start + lines.length };
    handleChange(index, {
      value: item.value.slice(0, start) + lines + item.value.slice(end),
      isMultiline: true,
    });
  };

  const handlePasteFromClipboard = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toastManager.add({ type: "error", description: pasteFailedMessage });
      return;
    }
    const pasted = parseEnvVariables(text);
    if (!pasted) {
      setClipboardContent("other");
      toastManager.add({ type: "error", description: pasteInvalidMessage });
      return;
    }
    updateItems(Object.entries(pasted).map(createPastedVariable));
  };

  const handleCopy = async () => {
    const text = stringifyEnvVariables(internalItems
      .filter(item => item.key.trim() !== "")
      .map(item => ({
        key: item.key.trim(),
        // Values of secrets are never copied out
        value: item.isSecret ? "" : item.value,
      })));
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const title = labels?.title ?? "Environment Variables";
  const description = labels?.description ?? "Configure runtime environment variables and secrets.";
  const addButton = labels?.addButton ?? "Add Variable";
  const copyButton = labels?.copyButton ?? "Copy as .env";
  const copiedButton = labels?.copiedButton ?? "Copied";
  const clearButton = labels?.clearButton ?? "Clear all";
  const pasteButton = labels?.pasteButton ?? "Paste .env";
  const pasteInvalidMessage = labels?.pasteInvalidMessage ?? "The clipboard has no environment variables.";
  const pasteFailedMessage = labels?.pasteFailedMessage ?? "The clipboard could not be read.";
  const removeButton = labels?.removeButton ?? "Remove variable";
  const keyLabel = labels?.keyLabel ?? "Key";
  const keyPlaceholder = labels?.keyPlaceholder ?? "e.g. DATABASE_URL";
  const valueLabel = labels?.valueLabel ?? "Value";
  const valuePlaceholder = labels?.valuePlaceholder ?? "e.g. postgres://...";
  const scopeLabel = labels?.scopeLabel ?? "Available in";
  const scopes = labels?.scopes ?? { build: "Build", runtime: "Runtime", both: "Both" };
  const scopeHelp = labels?.scopeHelp;
  const secretLabel = labels?.secretLabel ?? "Secret";
  const emptyMessage = labels?.emptyMessage ?? "No environment variables configured.";

  const columns = hasBuild
    ? "grid-cols-[1fr_auto_1fr_7rem_2.5rem_2.5rem]"
    : "grid-cols-[1fr_auto_1fr_2.5rem_2.5rem]";

  return (
    <div className={cn("space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="size-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            disabled={!internalItems.some(item => item.key.trim() !== "")}
            className="gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3" />
            <span>{copied ? copiedButton : copyButton}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => updateItems([])}
            disabled={disabled || internalItems.length === 0}
            className="gap-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <FontAwesomeIcon icon={faTrash} className="size-3" />
            <span>{clearButton}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={handleAdd}
            disabled={disabled}
            className="gap-1.5"
          >
            <FontAwesomeIcon icon={faPlus} className="size-3" />
            <span>{addButton}</span>
          </Button>
        </div>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-800 py-6 text-center">
          <p className="text-xs text-slate-500">{emptyMessage}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleAdd}
              disabled={disabled}
              className="text-slate-400 hover:text-slate-200"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1 size-3" />
              <span>{addButton}</span>
            </Button>
            {clipboardContent !== "other" && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handlePasteFromClipboard}
                disabled={disabled}
                className="gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <FontAwesomeIcon icon={faClipboard} className="size-3" />
                <span>{pasteButton}</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={cn("grid items-center gap-2 px-1 text-xs font-medium text-slate-400", columns)}>
            <span>{keyLabel}</span>
            <span className="w-4" />
            <span>{valueLabel}</span>
            {hasBuild && <span>{scopeLabel}</span>}
            <span className="text-center">{secretLabel}</span>
            <span />
          </div>
          {internalItems.map((item, index) => {
            const key = item.id ?? `env-${index}`;
            return (
              <div key={key} className="space-y-1">
                <div className={cn("grid items-start gap-2", columns)}>
                  <div>
                    <Label htmlFor={`env-key-${index}`} className="sr-only">
                      {keyLabel}
                    </Label>
                    <Input
                      id={`env-key-${index}`}
                      type="text"
                      size="sm"
                      className="font-mono text-xs uppercase"
                      placeholder={keyPlaceholder}
                      value={item.key}
                      onChange={e => handleChange(index, { key: e.target.value })}
                      onPaste={e => handlePaste(index, "key", e)}
                      disabled={disabled}
                    />
                  </div>
                  <span className="text-center font-mono text-xs leading-8 text-slate-500 select-none">=</span>
                  <div>
                    <Label htmlFor={`env-val-${index}`} className="sr-only">
                      {valueLabel}
                    </Label>
                    {item.isMultiline ? (
                      <Textarea
                        id={`env-val-${index}`}
                        autoGrow
                        size="sm"
                        autoComplete="off"
                        spellCheck={false}
                        className={cn("font-mono", item.isSecret && "[-webkit-text-security:disc]")}
                        placeholder={valuePlaceholder}
                        value={item.value}
                        onChange={e => handleChange(index, { value: e.target.value })}
                        onPaste={e => handlePaste(index, "value", e)}
                        disabled={disabled}
                      />
                    ) : (
                      <Input
                        id={`env-val-${index}`}
                        type={item.isSecret ? "password" : "text"}
                        autoComplete={item.isSecret ? "new-password" : "off"}
                        size="sm"
                        className="font-mono text-xs"
                        placeholder={item.isSecret && item.savedSecretKey === item.key.trim() && labels?.savedSecretPlaceholder
                          ? labels.savedSecretPlaceholder
                          : valuePlaceholder}
                        value={item.value}
                        onChange={e => handleChange(index, { value: e.target.value })}
                        onPaste={e => handlePaste(index, "value", e)}
                        disabled={disabled}
                      />
                    )}
                  </div>
                  {hasBuild && (
                    <div>
                      <Label htmlFor={`env-scope-${index}`} className="sr-only">
                        {scopeLabel}
                      </Label>
                      <Select
                        id={`env-scope-${index}`}
                        className="h-8 text-xs"
                        value={item.scope}
                        onChange={e => handleChange(index, { scope: e.target.value as EnvironmentVariableScope })}
                        disabled={disabled}
                      >
                        {environmentVariableScopes.map(scope => (
                          <option key={scope} value={scope}>{scopes[scope]}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleChange(index, { isSecret: !item.isSecret })}
                    disabled={disabled}
                    aria-label={secretLabel}
                    aria-pressed={item.isSecret}
                    title={secretLabel}
                    className={item.isSecret ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-slate-200"}
                  >
                    <FontAwesomeIcon icon={item.isSecret ? faLock : faLockOpen} className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    aria-label={removeButton}
                    className="text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                  </Button>
                </div>
                {item.note && <p className="px-1 text-xs text-sky-400">{item.note}</p>}
              </div>
            );
          })}
          {hasBuild && scopeHelp && (
            <p className="px-1 text-xs text-slate-500">{scopeHelp}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EnvironmentVariablesRepeater;
