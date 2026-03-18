'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SubmitButtonProps {
    children: ReactNode
    className?: string
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
    formAction?: (formData: FormData) => void | Promise<void>
}

export function SubmitButton({ children, className, variant, formAction }: SubmitButtonProps) {
    const { pending } = useFormStatus()

    return (
        <Button
            type="submit"
            disabled={pending}
            formAction={formAction}
            className={cn(
                "h-14 bg-red-700 hover:bg-red-800 text-white font-black text-lg rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px] transition-all flex items-center justify-center gap-3 w-full animate-in fade-in duration-500",
                className
            )}
            variant={variant}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    AUTHENTICATING...
                </>
            ) : (
                children
            )}
        </Button>
    )
}
