import { create } from 'zustand'

type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
    mode: ThemeMode
    resolvedTheme: ResolvedTheme
    setMode: (mode: ThemeMode) => void
}

const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') {
        return 'dark'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getStoredMode = (): ThemeMode => {
    if (typeof window === 'undefined') {
        return 'system'
    }

    const stored = window.localStorage.getItem('chaindeploy-theme') as ThemeMode | null
    return stored ?? 'system'
}

export const useThemeStore = create<ThemeState>((set) => ({
    mode: getStoredMode(),
    resolvedTheme: getSystemTheme(),
    setMode: (mode) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('chaindeploy-theme', mode)
        }

        set({
            mode,
            resolvedTheme: mode === 'system' ? getSystemTheme() : mode,
        })
    },
}))

if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const { mode } = useThemeStore.getState()
        if (mode === 'system') {
            useThemeStore.setState({ resolvedTheme: getSystemTheme() })
        }
    })
}
