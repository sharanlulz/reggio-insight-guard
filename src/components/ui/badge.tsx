import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-reggio-primary text-white hover:bg-reggio-primary-hover",
        secondary: "border-transparent bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300",
        destructive: "border-transparent bg-reggio-error text-white hover:bg-danger-600",
        outline: "text-foreground border-neutral-200 dark:border-neutral-700",
        success: "border-transparent bg-reggio-success text-white hover:bg-success-600",
        warning: "border-transparent bg-reggio-warning text-white hover:bg-warning-600",
        compliant: "border-success-200 bg-success-50 text-success-700 dark:border-success-600 dark:bg-success-900/20 dark:text-success-400",
        breach: "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-600 dark:bg-danger-900/20 dark:text-danger-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
