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
                "h-14 bg-primary text-background-dark font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(0,255,200,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 w-full animate-in fade-in duration-500",
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
