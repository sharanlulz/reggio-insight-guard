import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-reggio-primary text-white hover:bg-reggio-primary-hover active:bg-reggio-primary-active shadow-reggio-sm hover:shadow-reggio-md",
        destructive: "bg-reggio-error text-white hover:bg-danger-600 active:bg-danger-700 shadow-reggio-sm hover:shadow-reggio-md",
        outline: "border border-neutral-200 bg-background hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-800",
        secondary: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        link: "text-reggio-primary underline-offset-4 hover:underline hover:text-reggio-primary-hover",
        success: "bg-reggio-success text-white hover:bg-success-600 active:bg-success-700 shadow-reggio-sm hover:shadow-reggio-md",
        warning: "bg-reggio-warning text-white hover:bg-warning-600 active:bg-warning-700 shadow-reggio-sm hover:shadow-reggio-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base font-semibold",
        icon: "h-10 w-10",
        xs: "h-8 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
