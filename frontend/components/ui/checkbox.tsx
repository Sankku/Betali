"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../src/lib/utils";

interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "className" | "onChange"
  > {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLDivElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(checked);

    React.useEffect(() => {
      setIsChecked(checked);
    }, [checked]);

    const handleClick = () => {
      const newValue = !isChecked;
      setIsChecked(newValue);
      onCheckedChange?.(newValue);
    };

    return (
      <div
        ref={ref}
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "peer relative h-4 w-4 shrink-0 rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 data-[checked=true]:border-green-600",
          isChecked ? "bg-green-600 border-green-600" : "bg-white",
          className
        )}
        data-checked={isChecked}
        {...props}
      >
        {isChecked && (
          <Check className="absolute top-0 left-0 h-3.5 w-3.5 text-white stroke-[3]" />
        )}
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          aria-hidden="true"
        />
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
