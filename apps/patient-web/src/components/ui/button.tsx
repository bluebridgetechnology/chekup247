import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
  ({ className, variant, size, style, asChild = false, ...props }, ref) => {
    const isSm = size === 'sm';
    const isLg = size === 'lg';

    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      borderRadius: '8px',
      fontSize: isSm ? '0.8rem' : isLg ? '0.95rem' : '0.875rem',
      fontWeight: 600,
      cursor: 'pointer',
      padding: isSm ? '6px 12px' : isLg ? '10px 20px' : '8px 16px',
      minHeight: isSm ? '32px' : isLg ? '44px' : '38px',
      boxSizing: 'border-box',
      textDecoration: 'none',
      transition: 'all 0.15s ease',
      ...(variant === 'outline'
        ? {
            background: '#FFFFFF',
            border: '1px solid #EDE4D4',
            color: '#2A170F',
          }
        : variant === 'secondary'
        ? {
            background: '#FAF6EE',
            border: '1px solid #EDE4D4',
            color: '#6B5E55',
          }
        : variant === 'destructive'
        ? {
            background: '#dc2626',
            border: 'none',
            color: '#FFFFFF',
          }
        : variant === 'ghost'
        ? {
            background: 'transparent',
            border: 'none',
            color: '#2A170F',
          }
        : {
            background: '#EDD5B3',
            border: 'none',
            color: '#2A170F',
            boxShadow: '0 1px 3px rgba(42, 23, 15, 0.08)',
          }),
      ...style,
    };

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={baseStyles}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
