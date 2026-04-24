'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getActiveProfile, profileKey, type Profile } from '@/utils/profile';

function apply(theme: string) {
    if (theme === 'light') {
        document.documentElement.classList.add('hub-light-text');
    } else {
        document.documentElement.classList.remove('hub-light-text');
    }
}

async function loadForProfile(profile: Profile) {
    const cached = localStorage.getItem(`hub_text_theme_${profile}`);
    if (cached) apply(cached);
    const supabase = createClient();
    const { data } = await supabase.from('hub_settings').select('value')
        .eq('key', profileKey('text_theme', profile)).maybeSingle();
    const theme = data?.value ?? 'dark';
    apply(theme);
    localStorage.setItem(`hub_text_theme_${profile}`, theme);
}

export function TextThemeProvider() {
    useEffect(() => {
        let current = getActiveProfile();
        loadForProfile(current);

        const onProfile = (e: Event) => {
            current = (e as CustomEvent<Profile>).detail;
            loadForProfile(current);
        };

        const onTheme = (e: Event) => {
            apply((e as CustomEvent<string>).detail);
        };

        window.addEventListener('hub_profile_changed', onProfile);
        window.addEventListener('hub_text_theme_changed', onTheme);
        return () => {
            window.removeEventListener('hub_profile_changed', onProfile);
            window.removeEventListener('hub_text_theme_changed', onTheme);
        };
    }, []);

    return null;
}
