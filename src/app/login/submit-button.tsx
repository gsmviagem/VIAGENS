'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

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
            className={className}
            variant={variant}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                </>
            ) : (
                children
            )}
        </Button>
    )
}
