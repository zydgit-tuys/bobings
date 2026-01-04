import * as React from "react";
import { cn } from "@/lib/utils";

interface CustomSwitchProps {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function CustomSwitch({
    id,
    checked = false,
    onCheckedChange,
    disabled = false,
    className,
}: CustomSwitchProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!disabled && onCheckedChange) {
            onCheckedChange(e.target.checked);
        }
    };

    return (
        <label
            htmlFor={id}
            className={cn(
                "relative inline-block w-9 h-5 cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={handleChange}
                disabled={disabled}
                className="sr-only peer"
            />
            <span
                className={cn(
                    "absolute inset-0 rounded-full transition-colors duration-200",
                    "border border-input bg-input",
                    "peer-checked:bg-primary peer-checked:border-primary",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                )}
            />
            <span
                className={cn(
                    "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm",
                    "transition-transform duration-200",
                    "peer-checked:translate-x-4"
                )}
            />
        </label>
    );
}
