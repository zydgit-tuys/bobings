import { useState, useMemo } from 'react';
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
    useSensor(PointerSensor),
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
      <div className="p-6 space-y-4">
        <PageHeader title="Virtual Stock" description="Monitor supplier warehouse stock" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!sortedProducts.length) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Virtual Stock" description="Monitor supplier warehouse stock" />
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-4" />
          <p>No products with virtual stock enabled.</p>
          <p className="text-sm">Enable virtual stock on a product to track supplier inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Virtual Stock" description="Monitor supplier warehouse stock - drag to reorder" />

      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
          <div className="col-span-1"></div>
          <div className="col-span-3">Parent SKU</div>
          <div className="col-span-5">Product Name</div>
          <div className="col-span-3 text-right">Total Qty</div>
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
