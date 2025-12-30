import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b last:border-b-0',
        isDragging && 'opacity-50 bg-muted'
      )}
    >
      {/* Parent row */}
      <div
        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/30 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="col-span-1 flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-muted rounded p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="col-span-3 font-mono text-sm">{product.sku_master}</div>
        <div className="col-span-5 font-medium">{product.name}</div>
        <div className="col-span-3 text-right font-semibold">{totalQty}</div>
      </div>

      {/* Expanded variants */}
      {isExpanded && (
        <div className="bg-muted/20 border-t">
          {/* Sort controls */}
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
            <span>Sort by:</span>
            <Button
              variant={sortBy === 'size' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSortBy('size')}
            >
              Size
            </Button>
            <Button
              variant={sortBy === 'color' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSortBy('color')}
            >
              Color
            </Button>
          </div>

          {/* Variant header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
            <div className="col-span-1"></div>
            <div className="col-span-3">Variant SKU</div>
            <div className="col-span-2">Color</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-4 text-right">Qty</div>
          </div>

          {/* Variant rows */}
          {sortedVariants.map((variant) => (
            <VirtualStockVariantRow key={variant.id} variant={variant} />
          ))}

          {sortedVariants.length === 0 && (
            <div className="px-4 py-4 text-sm text-muted-foreground text-center">
              No variants found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
