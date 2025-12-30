import { useState, useRef, useEffect } from 'react';
import { useUpdateVariantVirtualQty } from '@/hooks/use-virtual-stock';
import { Input } from '@/components/ui/input';
import type { VirtualStockVariant } from '@/lib/api/virtual-stock';

interface Props {
  variant: VirtualStockVariant;
}

export function VirtualStockVariantRow({ variant }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [qty, setQty] = useState(variant.virtual_stock_qty.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const updateQty = useUpdateVariantVirtualQty();

  useEffect(() => {
    setQty(variant.virtual_stock_qty.toString());
  }, [variant.virtual_stock_qty]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const newQty = parseInt(qty, 10);
    if (!isNaN(newQty) && newQty >= 0 && newQty !== variant.virtual_stock_qty) {
      updateQty.mutate({ id: variant.id, qty: newQty });
    } else {
      setQty(variant.virtual_stock_qty.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setQty(variant.virtual_stock_qty.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 text-xs border-b last:border-b-0">
      {/* SKU - truncated */}
      <div className="font-mono text-muted-foreground truncate w-20 md:w-28 shrink-0">
        {variant.sku_variant}
      </div>
      
      {/* Color + Size combined on mobile */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="truncate">{variant.color_name || '-'}</span>
        <span className="text-muted-foreground">/</span>
        <span className="truncate">{variant.size_name || '-'}</span>
      </div>
      
      {/* Qty - editable */}
      <div className="shrink-0">
        {isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-14 h-7 text-right text-xs"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 rounded hover:bg-muted font-semibold min-w-[40px] text-right"
          >
            {variant.virtual_stock_qty}
          </button>
        )}
      </div>
    </div>
  );
}
