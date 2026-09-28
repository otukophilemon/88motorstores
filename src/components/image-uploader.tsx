import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/upload/client";

const MAX_IMAGES = 10;
const MAX_SIZE_MB = 8;

type Uploading = {
  id: string;
  name: string;
  preview: string;
};

export function ImageUploader({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Uploading[]>([]);

  const remaining = MAX_IMAGES - value.length - uploading.length;
  const canAddMore = remaining > 0 && !disabled;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Cap to remaining slots.
    const accepted = fileArray.slice(0, remaining);
    if (fileArray.length > remaining) {
      toast.error(`Up to ${MAX_IMAGES} images total. ${fileArray.length - remaining} skipped.`);
    }

    // Filter out non-images and oversized files.
    const valid: File[] = [];
    for (const file of accepted) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${MAX_SIZE_MB} MB.`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) return;

    // Show local previews immediately.
    const previews: Uploading[] = valid.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      preview: URL.createObjectURL(file),
    }));
    setUploading((u) => [...u, ...previews]);

    // Upload each in parallel — but manage them individually.
    await Promise.all(
      valid.map(async (file, i) => {
        const preview = previews[i];
        try {
          const url = await uploadImage(file);
          // Append to the parent's list, keep order stable.
          onChange([...value, url]);
          // Remove the local preview.
          setUploading((u) => u.filter((x) => x.id !== preview.id));
          URL.revokeObjectURL(preview.preview);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : `${file.name} upload failed.`,
          );
          setUploading((u) => u.filter((x) => x.id !== preview.id));
          URL.revokeObjectURL(preview.preview);
        }
      }),
    );

    // Reset the input so selecting the same file again works.
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="grid gap-4">
      {/* Existing uploads */}
      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
            >
              <img
                src={url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* In-flight uploads */}
      {uploading.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {uploading.map((u) => (
            <div
              key={u.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
            >
              <img
                src={u.preview}
                alt=""
                className="size-full object-cover opacity-50"
              />
              <div className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Drop zone / Add button */}
      {canAddMore ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled) return;
            void handleFiles(e.dataTransfer.files);
          }}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:aspect-video"
        >
          <ImagePlus className="size-6" />
          <span className="text-sm font-medium">
            Click to add or drag &amp; drop
          </span>
          <span className="text-xs">
            {remaining} of {MAX_IMAGES} remaining · JPEG, PNG, WebP, GIF · max{" "}
            {MAX_SIZE_MB} MB each
          </span>
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
        disabled={disabled}
      />

      {value.length + uploading.length >= MAX_IMAGES ? (
        <p className="text-xs text-muted-foreground">
          Maximum of {MAX_IMAGES} images reached.
        </p>
      ) : null}
    </div>
  );
}