import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "warning";
}

interface SwipeableCardProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  onClick?: () => void;
}

const ACTION_WIDTH = 72;
const SWIPE_THRESHOLD = 40;

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  className,
  onClick,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const maxLeftSwipe = rightActions.length * ACTION_WIDTH;
  const maxRightSwipe = leftActions.length * ACTION_WIDTH;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = offsetX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const diff = e.touches[0].clientX - startX.current;
    let newOffset = currentX.current + diff;
    
    // Limit swipe distance
    newOffset = Math.max(-maxLeftSwipe, Math.min(maxRightSwipe, newOffset));
    
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Snap to positions
    if (offsetX < -SWIPE_THRESHOLD && rightActions.length > 0) {
      setOffsetX(-maxLeftSwipe);
    } else if (offsetX > SWIPE_THRESHOLD && leftActions.length > 0) {
      setOffsetX(maxRightSwipe);
    } else {
      setOffsetX(0);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    setOffsetX(0);
  };

  const getActionBg = (variant: SwipeAction["variant"]) => {
    switch (variant) {
      case "destructive":
        return "bg-destructive text-destructive-foreground";
      case "warning":
        return "bg-amber-500 text-white";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left actions (shown when swiping right) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-opacity",
                getActionBg(action.variant)
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (shown when swiping left) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-opacity",
                getActionBg(action.variant)
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => offsetX === 0 && onClick?.()}
        className={cn(
          "relative bg-card border rounded-lg transition-transform",
          isDragging ? "transition-none" : "transition-transform duration-200",
          onClick && offsetX === 0 && "cursor-pointer active:bg-muted/50",
          className
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
