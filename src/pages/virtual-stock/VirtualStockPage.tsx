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
import { Button } from '@/components/ui/button';
import { Package, ArrowUpDown, Check } from 'lucide-react';

export default function VirtualStockPage() {
  const { data: products, isLoading } = useVirtualStockProducts();
  const updateSortOrder = useUpdateProductsSortOrder();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order);
    
    // If in reorder mode and we have local order, use that
    if (isReorderMode && localOrder.length > 0) {
      return localOrder
        .map(id => sorted.find(p => p.id === id))
        .filter(Boolean) as typeof sorted;
    }
    
    return sorted;
  }, [products, isReorderMode, localOrder]);

  const handleEnterReorderMode = () => {
    setIsReorderMode(true);
    setLocalOrder(sortedProducts.map(p => p.id));
    setExpandedProducts(new Set()); // Collapse all when reordering
  };

  const handleSaveReorder = () => {
    const updates = localOrder.map((id, idx) => ({ id, sort_order: idx }));
    updateSortOrder.mutate(updates, {
      onSuccess: () => {
        setIsReorderMode(false);
        setLocalOrder([]);
      }
    });
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setLocalOrder([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over.id as string);
      setLocalOrder(arrayMove(localOrder, oldIndex, newIndex));
    }
  };

  const toggleExpand = (productId: string) => {
    if (isReorderMode) return; // Disable expand in reorder mode
    
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
      <PageHeader 
        title="Virtual Stock" 
        description={isReorderMode ? "Drag to reorder" : "Supplier warehouse"}
        action={
          isReorderMode ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelReorder}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveReorder} disabled={updateSortOrder.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleEnterReorderMode}>
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              Reorder
            </Button>
          )
        }
      />

      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Header - hidden on mobile, show on md+ */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
          <div className="col-span-1"></div>
          <div className="col-span-3">SKU</div>
          <div className="col-span-5">Product</div>
          <div className="col-span-3 text-right">Total</div>
        </div>

        {isReorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localOrder}
              strategy={verticalListSortingStrategy}
            >
              {sortedProducts.map((product) => (
                <VirtualStockProductRow
                  key={product.id}
                  product={product}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  isReorderMode={true}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          sortedProducts.map((product) => (
            <VirtualStockProductRow
              key={product.id}
              product={product}
              isExpanded={expandedProducts.has(product.id)}
              onToggleExpand={() => toggleExpand(product.id)}
              isReorderMode={false}
            />
          ))
        )}
      </div>
    </div>
  );
}
