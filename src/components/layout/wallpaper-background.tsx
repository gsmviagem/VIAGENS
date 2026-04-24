'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getActiveProfile, profileKey, type Profile } from '@/utils/profile';

function getYoutubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

function detectType(url: string): 'youtube' | 'video' | 'image' | null {
    if (!url) return null;
    if (getYoutubeId(url)) return 'youtube';
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return 'video';
    return 'image';
}

export interface WallpaperSettings {
    url: string;
    blur: number;
    dim: number;
}

const DEFAULT: WallpaperSettings = { url: '', blur: 0, dim: 0 };

function cacheKey(profile: Profile) { return `hub_wallpaper_${profile}`; }

async function loadForProfile(profile: Profile): Promise<WallpaperSettings> {
    const cached = localStorage.getItem(cacheKey(profile));
    if (cached) {
        try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    const supabase = createClient();
    const { data } = await supabase
        .from('hub_settings').select('value')
        .eq('key', profileKey('wallpaper_settings', profile))
        .maybeSingle();
    if (data?.value) {
        try {
            const parsed = JSON.parse(data.value);
            localStorage.setItem(cacheKey(profile), data.value);
            return parsed;
        } catch { /* ignore */ }
    }
    return DEFAULT;
}

export function WallpaperBackground() {
    const [settings, setSettings] = useState<WallpaperSettings>(DEFAULT);

    useEffect(() => {
        let current = getActiveProfile();

        const load = (profile: Profile) => {
            const cached = localStorage.getItem(cacheKey(profile));
            if (cached) {
                try { setSettings(JSON.parse(cached)); } catch { /* ignore */ }
            }
            loadForProfile(profile).then(setSettings);
        };

        load(current);

        const onProfile = (e: Event) => {
            current = (e as CustomEvent<Profile>).detail;
            load(current);
        };

        const onWallpaper = (e: Event) => {
            const s = (e as CustomEvent<WallpaperSettings>).detail;
            setSettings(s);
        };

        window.addEventListener('hub_profile_changed', onProfile);
        window.addEventListener('hub_wallpaper_settings_changed', onWallpaper);
        return () => {
            window.removeEventListener('hub_profile_changed', onProfile);
            window.removeEventListener('hub_wallpaper_settings_changed', onWallpaper);
        };
    }, []);

    if (!settings.url) return null;

    const type = detectType(settings.url);
    const scale = settings.blur > 0 ? 1 + settings.blur * 0.008 : 1;

    const mediaStyle: React.CSSProperties = {
        position: 'absolute',
        top: '50%', left: '50%',
        width: '100vw', height: '100vh',
        minWidth: '100%', minHeight: '100%',
        objectFit: 'cover',
        transform: `translate(-50%, -50%) scale(${scale})`,
        filter: settings.blur > 0 ? `blur(${settings.blur}px)` : undefined,
    };

    const wrapStyle: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: -30, pointerEvents: 'none', overflow: 'hidden',
    };

    return (
        <div style={wrapStyle}>
            {type === 'youtube' && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: `max(100vw, calc(100vh * 16 / 9))`,
                    height: `max(100vh, calc(100vw * 9 / 16))`,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    filter: settings.blur > 0 ? `blur(${settings.blur}px)` : undefined,
                }}>
                    <iframe
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        src={`https://www.youtube.com/embed/${getYoutubeId(settings.url)}?autoplay=1&mute=1&loop=1&playlist=${getYoutubeId(settings.url)}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=0`}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                    />
                </div>
            )}
            {type === 'video' && (
                <video style={mediaStyle} src={settings.url} autoPlay muted loop playsInline />
            )}
            {type === 'image' && (
                <img style={mediaStyle} src={settings.url} alt="" />
            )}
            {settings.dim > 0 && (
                <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${settings.dim / 100})` }} />
            )}
        </div>
    );
}
