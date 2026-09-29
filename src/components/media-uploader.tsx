import { Image as ImageIcon, Loader2, Play, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { upload as uploadBlob } from "@vercel/blob/client";

const MAX_ITEMS = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

export type MediaItem = {
  url: string;
  type: "image" | "video";
};

type Uploading = {
  id: string;
  name: string;
  preview: string;
  type: "image" | "video";
};

async function uploadFile(file: File): Promise<MediaItem> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    throw new Error(`${file.name} is not an image or video.`);
  }
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      `${file.name} exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`,
    );
  }

  const blob = await uploadBlob(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });

  return { url: blob.url, type: isVideo ? "video" : "image" };
}

/**
 * Compact media uploader — shows a small attach button plus thumbnails.
 * No big drop zone; drag-drop still works if you drop onto the container.
 */
export function MediaUploader({
  value,
  onChange,
  disabled = false,
  maxItems = MAX_ITEMS,
}: {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  disabled?: boolean;
  maxItems?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const remaining = maxItems - value.length - uploading.length;
  const canAddMore = remaining > 0 && !disabled;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const accepted = fileArray.slice(0, remaining);
    if (fileArray.length > remaining) {
      toast.error(
        `Up to ${maxItems} items. ${fileArray.length - remaining} skipped.`,
      );
    }

    const valid: File[] = [];
    for (const file of accepted) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) {
        toast.error(`${file.name} is not an image or video.`);
        continue;
      }
      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        toast.error(
          `${file.name} exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`,
        );
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    const previews: Uploading[] = valid.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setUploading((u) => [...u, ...previews]);

    await Promise.all(
      valid.map(async (file, i) => {
        const preview = previews[i];
        try {
          const item = await uploadFile(file);
          onChange([...value, item]);
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

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(url: string) {
    onChange(value.filter((item) => item.url !== url));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (canAddMore) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled || !canAddMore) return;
        void handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-lg ${
        dragOver ? "bg-primary/5 outline outline-2 outline-dashed outline-primary/50" : ""
      }`}
    >
      {/* Thumbnails + attach button inline */}
      <div className="flex flex-wrap items-center gap-2">
        {value.map((item) => (
          <div
            key={item.url}
            className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-secondary"
          >
            {item.type === "video" ? (
              <>
                <video
                  src={item.url}
                  className="size-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/20">
                  <span className="grid size-5 place-items-center rounded-full bg-background/80">
                    <Play className="size-2.5 fill-current" />
                  </span>
                </div>
              </>
            ) : (
              <img
                src={item.url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            )}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeItem(item.url)}
                className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        ))}

        {uploading.map((u) => (
          <div
            key={u.id}
            className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-secondary"
          >
            {u.type === "video" ? (
              <video
                src={u.preview}
                className="size-full object-cover opacity-60"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={u.preview}
                alt=""
                className="size-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 grid place-items-center bg-background/50">
              <Loader2 className="size-4 animate-spin text-primary" />
            </div>
          </div>
        ))}

        {canAddMore ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid size-16 shrink-0 place-items-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            title="Add photo or video"
            aria-label="Add photo or video"
          >
            <ImageIcon className="size-5" />
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
        disabled={disabled}
      />

      {/* Optional hint, tiny */}
      {value.length + uploading.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Add photos or videos (up to {maxItems}, 25 MB each).
        </p>
      ) : null}
    </div>
  );
}