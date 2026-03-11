'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    // Artificial bypass: just redirect to dashboard
    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    // Artificial bypass: just redirect to dashboard
    revalidatePath('/', 'layout')
    redirect('/')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
