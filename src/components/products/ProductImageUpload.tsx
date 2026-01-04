import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2, GripVertical, Star } from 'lucide-react';
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
import { ProductImage } from '@/lib/api/product-images';
import { useCreateProductImage, useDeleteProductImage, useReorderProductImages, useSetPrimaryImage } from '@/hooks/use-product-images';

interface Props {
  productId: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
}

function SortableImageItem({
  image,
  onRemove,
  onSetPrimary,
  isPrimary
}: {
  image: ProductImage;
  onRemove: () => void;
  onSetPrimary: () => void;
  isPrimary: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

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
        isDragging && "opacity-50 z-50",
        isPrimary && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <img
        src={image.image_url}
        alt="Product"
        className="w-full h-full object-cover"
      />

      {/* Primary Badge */}
      {isPrimary && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          Primary
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <div className="flex gap-2">
          {!isPrimary && (
            <button
              onClick={onSetPrimary}
              type="button"
              className="p-1.5 bg-white/90 rounded hover:bg-white touch-manipulation"
              title="Set as Primary"
            >
              <Star className="h-4 w-4 text-yellow-500" />
            </button>
          )}
          <button
            {...attributes}
            {...listeners}
            type="button"
            className="p-1.5 bg-white/90 rounded cursor-grab hover:bg-white touch-manipulation"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={onRemove}
            type="button"
            className="p-1.5 bg-red-500 rounded hover:bg-red-600 touch-manipulation"
            title="Remove"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductImageUpload({ productId, images, onImagesChange }: Props) {
  const isEditMode = productId !== "new";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // API Hooks
  const createImg = useCreateProductImage();
  const deleteImg = useDeleteProductImage();
  const reorderImg = useReorderProductImages();
  const setPrimaryImg = useSetPrimaryImage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ProductImage[] = [];

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
          const result = await uploadImage(file, {
            folder: `products/${productId === 'new' ? 'temp' : productId}`,
            quality: 0.8,
            maxWidth: 1920,
            maxHeight: 1920,
          });

          const maxOrder = images.length > 0
            ? Math.max(...images.map(i => i.display_order))
            : -1;

          const newImageObj: any = {
            product_id: productId,
            image_url: result.publicUrl,
            storage_path: result.storagePath,
            display_order: maxOrder + 1 + newImages.length,
            is_primary: images.length === 0 && newImages.length === 0, // First image is primary
            file_size: result.fileSize,
            width: result.width,
            height: result.height,
            alt_text: file.name.split('.')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (isEditMode) {
            // Direct DB Create
            const savedImg = await createImg.mutateAsync(newImageObj);
            newImages.push(savedImg); // Use returned object with real ID
          } else {
            // Local State only (Create Mode)
            // Generate temp ID
            newImageObj.id = `temp-${Date.now()}-${Math.random()}`;
            newImages.push(newImageObj);
          }
        } catch (error: any) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          console.error(error);
        }
      }

      if (newImages.length > 0) {
        if (isEditMode) {
          // Provide optimistic update or wait for invalidation?
          // The hook invalidates queries, so parent should re-render.
          // But we can call onImagesChange to update local view instantly if parent supports it
        } else {
          onImagesChange([...images, ...newImages]);
        }
        toast.success(`${newImages.length} image(s) processed`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload process');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (image: ProductImage) => {
    try {
      if (isEditMode) {
        // Delete from DB (and ideally storage via trigger or separate call)
        await deleteImg.mutateAsync(image.id);

        // Cleanup storage too
        const { deleteImage } = await import('@/lib/utils/imageUpload');
        await deleteImage(image.image_url).catch(console.error); // Ignore storage error if DB deleted
      } else {
        // Create Mode: Just remove from list and storage
        const { deleteImage } = await import('@/lib/utils/imageUpload');
        await deleteImage(image.image_url);
        onImagesChange(images.filter(img => img.id !== image.id));
      }
    } catch (error: any) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleSetPrimary = async (image: ProductImage) => {
    if (isEditMode) {
      await setPrimaryImg.mutateAsync({ productId, imageId: image.id });
    } else {
      // Local update
      const updated = images.map(img => ({
        ...img,
        is_primary: img.id === image.id
      }));
      onImagesChange(updated);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);

      const newOrder = arrayMove(images, oldIndex, newIndex);

      // Update display_order property
      const updatedImages = newOrder.map((img, idx) => ({
        ...img,
        display_order: idx
      }));

      onImagesChange(updatedImages); // Optimistic update

      if (isEditMode) {
        reorderImg.mutate({
          productId,
          imageIds: updatedImages.map(img => img.id)
        });
      }
    }
  };

  return (
    <div className="space-y-2">
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
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <ImagePlus className="h-3 w-3 mr-1" />
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
          <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-1.5">
              {images.map((image) => (
                <SortableImageItem
                  key={image.id}
                  image={image}
                  isPrimary={image.is_primary}
                  onRemove={() => handleRemove(image)}
                  onSetPrimary={() => handleSetPrimary(image)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">Click to upload</p>
        </div>
      )}
    </div>
  );
}
