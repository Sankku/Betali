import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full",
          "rounded-lg border-2 border-neutral-300 bg-white",
          "px-4 py-3",
          "text-sm font-medium text-neutral-900",
          "placeholder:text-neutral-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "hover:border-neutral-400 hover:bg-neutral-50",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-neutral-100",
          "shadow-sm",
          "transition-all duration-200",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }