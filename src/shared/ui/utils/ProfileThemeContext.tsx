import { createContext, useContext, ReactNode } from 'react'
import { getThemeGradient } from './ThemeSelector'

type ProfileThemeContextType = {
  themeId?: string
  customColor1?: string
  customColor2?: string
  getThemeStyle: () => React.CSSProperties
}

const ProfileThemeContext = createContext<ProfileThemeContextType | null>(null)

type ProfileThemeProviderProps = {
  themeId?: string
  customColor1?: string
  customColor2?: string
  children: ReactNode
}

export function ProfileThemeProvider({ themeId, customColor1, customColor2, children }: ProfileThemeProviderProps) {
  const getThemeStyle = (): React.CSSProperties => {
    if (!themeId || themeId === 'default') return {}
    
    const gradient = getThemeGradient(themeId, customColor1, customColor2)
    if (!gradient) return {}

    return {
      backgroundImage: gradient,
      backgroundColor: 'rgba(15, 23, 42, 0.35)'
    }
  }

  return (
    <ProfileThemeContext.Provider value={{ themeId, customColor1, customColor2, getThemeStyle }}>
      {children}
    </ProfileThemeContext.Provider>
  )
}

export function useProfileTheme() {
  const context = useContext(ProfileThemeContext)
  return context || { themeId: undefined, customColor1: undefined, customColor2: undefined, getThemeStyle: () => ({}) }
}
