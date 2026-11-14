"use client";

/* eslint-disable @next/next/no-img-element -- local object-URL previews */
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedImage = { name: string; url: string };

/** Drag-and-drop image picker (mock upload: files stay in the browser). */
export function ImageDropzone({
  value,
  onChange,
  max = 4,
}: {
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const images = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, max - value.length)
      .map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    onChange([...value, ...images]);
  }

  function remove(i: number) {
    URL.revokeObjectURL(value[i].url);
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        disabled={value.length >= max}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-all",
          dragging ? "scale-[1.01] border-blue-500 bg-blue-50" : "border-slate-300 bg-white/60 hover:border-blue-400 hover:bg-blue-50/50",
          value.length >= max && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <ImagePlus className="size-5" />
        </span>
        <span className="text-sm font-medium">
          Drop site photos here or <span className="text-blue-700 underline underline-offset-2">browse</span>
        </span>
        <span className="text-xs text-slate-500">PNG or JPG · up to {max} images</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {value.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {value.map((img, i) => (
            <li key={img.url} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={img.url} alt={img.name} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${img.name}`}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
