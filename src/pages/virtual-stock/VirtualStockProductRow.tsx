import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualStockVariantRow } from './VirtualStockVariantRow';
import { Button } from '@/components/ui/button';
import type { VirtualStockProduct, VirtualStockVariant } from '@/lib/api/virtual-stock';

interface Props {
  product: VirtualStockProduct;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

type SortKey = 'size' | 'color';

export function VirtualStockProductRow({ product, isExpanded, onToggleExpand }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('size');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalQty = useMemo(() => {
    return product.variants.reduce((sum, v) => sum + v.virtual_stock_qty, 0);
  }, [product.variants]);

  const sortedVariants = useMemo(() => {
    const variants = [...product.variants];
    if (sortBy === 'size') {
      return variants.sort((a, b) => (a.size_name || '').localeCompare(b.size_name || ''));
    }
    return variants.sort((a, b) => (a.color_name || '').localeCompare(b.color_name || ''));
  }, [product.variants, sortBy]);

  const firstImage = product.images?.[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b last:border-b-0',
        isDragging && 'opacity-50 bg-muted'
      )}
    >
      {/* Parent row - mobile optimized */}
      <div
        className="flex items-center gap-2 px-2 py-2 md:grid md:grid-cols-12 md:gap-2 md:px-3 md:py-2 hover:bg-muted/30 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Drag handle + expand icon */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-muted rounded p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        {/* Image thumbnail */}
        <div className="w-8 h-8 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {firstImage ? (
            <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {/* Mobile: SKU + Name stacked, Desktop: grid layout */}
        <div className="flex-1 min-w-0 md:contents">
          <div className="md:col-span-3 font-mono text-xs truncate">{product.sku_master}</div>
          <div className="md:col-span-5 text-xs md:text-sm font-medium truncate md:block hidden">{product.name}</div>
        </div>

        {/* Total qty */}
        <div className="text-right font-semibold text-sm md:col-span-3 shrink-0 min-w-[40px]">{totalQty}</div>
      </div>

      {/* Expanded variants */}
      {isExpanded && (
        <div className="bg-muted/20 border-t">
          {/* Sort controls */}
          <div className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground border-b bg-muted/30">
            <span>Sort:</span>
            <Button
              variant={sortBy === 'size' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-5 text-xs px-2"
              onClick={() => setSortBy('size')}
            >
              Size
            </Button>
            <Button
              variant={sortBy === 'color' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-5 text-xs px-2"
              onClick={() => setSortBy('color')}
            >
              Color
            </Button>
          </div>

          {/* Variant rows - no header on mobile for compactness */}
          {sortedVariants.map((variant) => (
            <VirtualStockVariantRow key={variant.id} variant={variant} />
          ))}

          {sortedVariants.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No variants
            </div>
          )}
        </div>
      )}
    </div>
  );
}
