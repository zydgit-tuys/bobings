import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualStockVariantRow } from './VirtualStockVariantRow';
import { Button } from '@/components/ui/button';
import type { VirtualStockProduct } from '@/lib/api/virtual-stock';

interface Props {
  product: VirtualStockProduct;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isReorderMode?: boolean;
}

type SortKey = 'size' | 'color';

export function VirtualStockProductRow({ product, isExpanded, onToggleExpand, isReorderMode = false }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('size');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !isReorderMode });

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

  // Reorder mode - simplified row with drag handle
  if (isReorderMode) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex items-center gap-3 px-3 py-3 border-b last:border-b-0 bg-card',
          isDragging && 'opacity-50 bg-muted shadow-lg'
        )}
      >
        {/* Drag handle - always visible in reorder mode */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Image thumbnail */}
        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
          {firstImage ? (
            <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-muted-foreground truncate">{product.sku_master}</div>
          <div className="text-sm font-medium truncate">{product.name}</div>
        </div>

        {/* Total qty */}
        <div className="text-right font-semibold text-sm shrink-0">{totalQty}</div>
      </div>
    );
  }

  // Normal mode - expandable row
  return (
    <div className="border-b last:border-b-0">
      {/* Parent row */}
      <div
        className="flex items-center gap-2 px-2 py-2 hover:bg-muted/30 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Expand icon */}
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Image thumbnail */}
        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
          {firstImage ? (
            <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-muted-foreground truncate">{product.sku_master}</div>
          <div className="text-sm font-medium truncate hidden md:block">{product.name}</div>
        </div>

        {/* Total qty */}
        <div className="text-right font-semibold text-sm shrink-0 min-w-[40px]">{totalQty}</div>
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
              onClick={(e) => { e.stopPropagation(); setSortBy('size'); }}
            >
              Size
            </Button>
            <Button
              variant={sortBy === 'color' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-5 text-xs px-2"
              onClick={(e) => { e.stopPropagation(); setSortBy('color'); }}
            >
              Color
            </Button>
          </div>

          {/* Variant rows */}
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
