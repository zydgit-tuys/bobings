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
    <div className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-muted/50 text-sm">
      <div className="col-span-1"></div>
      <div className="col-span-3 font-mono text-xs text-muted-foreground">
        {variant.sku_variant}
      </div>
      <div className="col-span-2">{variant.color_name || '-'}</div>
      <div className="col-span-2">{variant.size_name || '-'}</div>
      <div className="col-span-4 flex justify-end">
        {isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-20 h-8 text-right"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 rounded hover:bg-muted font-medium min-w-[60px] text-right"
          >
            {variant.virtual_stock_qty}
          </button>
        )}
      </div>
    </div>
  );
}
