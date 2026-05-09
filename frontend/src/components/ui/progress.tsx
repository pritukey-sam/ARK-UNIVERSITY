import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
 value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
 ({ className, value, ...props }, ref) => (
 <div
 ref={ref}
 role="progressbar"
 aria-valuemin={0}
 aria-valuemax={100}
 aria-valuenow={value}
 className={cn(
 "relative w-full overflow-hidden rounded-full bg-zinc-800",
 className
 )}
 {...props}
 >
 <div
 className="h-full w-full flex-1 bg-[#7C3AED] transition-all"
 style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
 />
 </div>
 )
)
Progress.displayName = "Progress"

export { Progress }
