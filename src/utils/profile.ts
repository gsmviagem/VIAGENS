export type Profile = 'salem' | 'ulrych';
export const PROFILES: Profile[] = ['salem', 'ulrych'];
export const PROFILE_LABELS: Record<Profile, string> = { salem: 'SALEM', ulrych: 'ULRYCH' };

export function getActiveProfile(): Profile {
    if (typeof window === 'undefined') return 'salem';
    return (localStorage.getItem('hub_active_profile') as Profile) ?? 'salem';
}

export function setActiveProfile(p: Profile) {
    localStorage.setItem('hub_active_profile', p);
    window.dispatchEvent(new CustomEvent('hub_profile_changed', { detail: p }));
}

export function profileKey(baseKey: string, p?: Profile): string {
    return `profile_${p ?? getActiveProfile()}_${baseKey}`;
}
