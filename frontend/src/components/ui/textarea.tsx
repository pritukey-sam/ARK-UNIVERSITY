import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
 return (
 <textarea
 data-slot="textarea"
 className={cn(
 "flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground outline-none focus-visible:border-ring  disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
 className
 )}
 {...props}
 />
 )
}

export { Textarea }
