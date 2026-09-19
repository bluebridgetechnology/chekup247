import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
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

function Badge({ className, variant, style, ...props }: BadgeProps) {
  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: '1.2',
    boxSizing: 'border-box',
    border: '1px solid transparent',
    ...(variant === 'outline'
      ? {
          background: '#FAF6EE',
          borderColor: '#EDE4D4',
          color: '#2A170F',
        }
      : variant === 'secondary'
      ? {
          background: '#EDE4D4',
          color: '#2A170F',
        }
      : variant === 'destructive'
      ? {
          background: '#fee2e2',
          borderColor: '#fecaca',
          color: '#b91c1c',
        }
      : {
          background: '#EDD5B3',
          color: '#2A170F',
        }),
    ...style,
  };

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={badgeStyles}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
