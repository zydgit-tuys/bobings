import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PageHeader } from '@/components/shared/PageHeader';
import { VirtualStockProductRow } from './VirtualStockProductRow';
import { useVirtualStockProducts, useUpdateProductsSortOrder } from '@/hooks/use-virtual-stock';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

export default function VirtualStockPage() {
  const { data: products, isLoading } = useVirtualStockProducts();
  const updateSortOrder = useUpdateProductsSortOrder();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products].sort((a, b) => a.sort_order - b.sort_order);
  }, [products]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedProducts.findIndex((p) => p.id === active.id);
      const newIndex = sortedProducts.findIndex((p) => p.id === over.id);

      const reordered = arrayMove(sortedProducts, oldIndex, newIndex);
      const updates = reordered.map((p, idx) => ({ id: p.id, sort_order: idx }));

      updateSortOrder.mutate(updates);
    }
  };

  const toggleExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <PageHeader title="Virtual Stock" description="Supplier warehouse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!sortedProducts.length) {
    return (
      <div className="space-y-3">
        <PageHeader title="Virtual Stock" description="Supplier warehouse" />
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mb-3" />
          <p className="text-sm">No products with virtual stock.</p>
          <p className="text-xs">Enable on product detail page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Virtual Stock" description="Drag to reorder" />

      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Header - hidden on mobile, show on md+ */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
          <div className="col-span-1"></div>
          <div className="col-span-3">SKU</div>
          <div className="col-span-5">Product</div>
          <div className="col-span-3 text-right">Total</div>
        </div>

        {/* Draggable list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedProducts.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedProducts.map((product) => (
              <VirtualStockProductRow
                key={product.id}
                product={product}
                isExpanded={expandedProducts.has(product.id)}
                onToggleExpand={() => toggleExpand(product.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
