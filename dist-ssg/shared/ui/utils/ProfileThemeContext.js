import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { getThemeGradient } from './ThemeSelector.js';
const ProfileThemeContext = createContext(null);
export function ProfileThemeProvider({ themeId, customColor1, customColor2, children }) {
    const getThemeStyle = () => {
        if (!themeId || themeId === 'default')
            return {};
        const gradient = getThemeGradient(themeId, customColor1, customColor2);
        if (!gradient)
            return {};
        return {
            backgroundImage: gradient,
            backgroundColor: 'rgba(15, 23, 42, 0.35)'
        };
    };
    return (_jsx(ProfileThemeContext.Provider, { value: { themeId, customColor1, customColor2, getThemeStyle }, children: children }));
}
export function useProfileTheme() {
    const context = useContext(ProfileThemeContext);
    return context || { themeId: undefined, customColor1: undefined, customColor2: undefined, getThemeStyle: () => ({}) };
}
