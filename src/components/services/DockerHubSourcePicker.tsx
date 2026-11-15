"use client";
import { faDocker } from "@fortawesome/free-brands-svg-icons/faDocker";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faTag } from "@fortawesome/free-solid-svg-icons/faTag";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useRef, useState } from "react";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type DockerHubSourcePickerProps = {
  selectedImage?: string,
  selectedTag?: string,
  onSelectImage?: (image: string) => void,
  onSelectTag?: (tag: string) => void,
  disabled?: boolean,
  className?: string,
};

const selectClassName = cn(
  "h-10 w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 text-sm text-slate-100 shadow-xs",
  "hover:border-slate-600",
  "focus:border-slate-400 focus:outline-hidden focus-visible:outline-slate-400",
  "disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600",
);

const DockerHubSourcePicker = ({
  selectedImage: controlledImage,
  selectedTag: controlledTag,
  onSelectImage,
  onSelectTag,
  disabled = false,
  className,
}: DockerHubSourcePickerProps) => {
  const [image, setImage] = useState<string>(controlledImage ?? "");
  const [tag, setTag] = useState<string>(controlledTag ?? "latest");
  const [tags, setTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(false);
  const [isCustomTag, setIsCustomTag] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync controlled props
  useEffect(() => {
    if (controlledImage !== undefined) {
      setImage(controlledImage);
    }
  }, [controlledImage]);

  useEffect(() => {
    if (controlledTag !== undefined) {
      setTag(controlledTag);
    }
  }, [controlledTag]);

  // Fetch tags with debouncing when image changes
  useEffect(() => {
    const trimmed = image.trim();
    if (!trimmed) {
      setTags([]);
      setIsLoadingTags(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoadingTags(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/sources/dockerhub/tags?image=${encodeURIComponent(trimmed)}`);
        if (!response.ok) {
          throw new Error("Failed to load tags.");
        }
        const data = await response.json();
        const availableTags: string[] = data.tags || [];
        setTags(availableTags);

        // Pre-select 'latest' if in tags and current tag is empty or default
        if (availableTags.length > 0) {
          if (!tag || !availableTags.includes(tag)) {
            const defaultTag = availableTags.includes("latest") ? "latest" : availableTags[0];
            setTag(defaultTag);
            onSelectTag?.(defaultTag);
          }
        }
      } catch {
        setTags([]);
      } finally {
        setIsLoadingTags(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [image]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextImage = e.target.value;
    setImage(nextImage);
    onSelectImage?.(nextImage);
  };

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setIsCustomTag(true);
      return;
    }
    setIsCustomTag(false);
    setTag(val);
    onSelectTag?.(val);
  };

  const handleCustomTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTag = e.target.value;
    setTag(nextTag);
    onSelectTag?.(nextTag);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input type="hidden" name="repository" value={image} />
      <input type="hidden" name="branch" value={tag} />
      {/* Image Name Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="docker-image-input" className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faDocker} className="text-slate-400" />
            Docker Image Name
          </Label>
          {isLoadingTags && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
              Looking up tags...
            </span>
          )}
        </div>
        <Input
          id="docker-image-input"
          placeholder="e.g. redis, library/nginx, bitnami/postgresql"
          value={image}
          onChange={handleImageChange}
          disabled={disabled}
        />
      </div>
      {/* Tag Selection / Input */}
      {image.trim().length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="docker-tag-select" className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faTag} className="text-slate-400" />
              Image Tag / Version
            </Label>
            {tags.length > 0 && !isCustomTag && (
              <button
                type="button"
                onClick={() => setIsCustomTag(true)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Enter custom tag
              </button>
            )}
            {isCustomTag && tags.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCustomTag(false)}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Choose from suggested tags
              </button>
            )}
          </div>
          {tags.length > 0 && !isCustomTag ? (
            <select
              id="docker-tag-select"
              value={tags.includes(tag) ? tag : "__custom__"}
              onChange={handleTagSelect}
              disabled={disabled || isLoadingTags}
              className={selectClassName}
            >
              {tags.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__custom__">Custom tag...</option>
            </select>
          ) : (
            <Input
              id="docker-tag-input"
              placeholder="e.g. latest, alpine, 16.2"
              value={tag}
              onChange={handleCustomTagChange}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DockerHubSourcePicker;
