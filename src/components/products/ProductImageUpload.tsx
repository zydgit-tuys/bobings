import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  productId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
}

function SortableImageItem({
  url,
  onRemove
}: {
  url: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square rounded-lg overflow-hidden border bg-muted",
        isDragging && "opacity-50 z-50"
      )}
    >
      <img
        src={url}
        alt="Product"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-2 md:p-1.5 bg-white/90 rounded cursor-grab hover:bg-white touch-manipulation"
        >
          <GripVertical className="h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onRemove}
          className="p-2 md:p-1.5 bg-red-500 rounded hover:bg-red-600 touch-manipulation"
        >
          <X className="h-5 w-5 md:h-4 md:w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export function ProductImageUpload({ productId, images, onImagesChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      const { uploadImage, validateImageFile } = await import('@/lib/utils/imageUpload');

      for (const file of Array.from(files)) {
        // Validate file
        const validationError = validateImageFile(file, 10); // Max 10MB
        if (validationError) {
          toast.error(`${file.name}: ${validationError}`);
          continue;
        }

        try {
          // Upload with WebP conversion & compression
          const url = await uploadImage(file, {
            folder: `products/${productId}`,
            quality: 0.8,
            maxWidth: 1920,
            maxHeight: 1920,
          });

          newUrls.push(url);
        } catch (error: any) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          console.error(error);
        }
      }

      if (newUrls.length > 0) {
        onImagesChange([...images, ...newUrls]);
        toast.success(`${newUrls.length} image(s) uploaded (WebP, compressed)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (urlToRemove: string) => {
    try {
      const { deleteImage } = await import('@/lib/utils/imageUpload');
      await deleteImage(urlToRemove);
      onImagesChange(images.filter(url => url !== urlToRemove));
      toast.success('Image removed');
    } catch (error: any) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      onImagesChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{images.length} images</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5 mr-1" />
          )}
          Add
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-2">
              {images.map((url) => (
                <SortableImageItem
                  key={url}
                  url={url}
                  onRemove={() => handleRemove(url)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Click to upload</p>
        </div>
      )}
    </div>
  );
}
