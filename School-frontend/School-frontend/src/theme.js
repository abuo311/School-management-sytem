export const SCHOOL_THEMES = [
    { id: 'blue', label: 'Blue', color: '#1d4ed8', soft: '#eff6ff' },
    { id: 'green', label: 'Green', color: '#15803d', soft: '#f0fdf4' },
    { id: 'burgundy', label: 'Burgundy', color: '#9f1239', soft: '#fff1f2' },
    { id: 'purple', label: 'Purple', color: '#6d28d9', soft: '#f5f3ff' }
];

export const getSchoolTheme = (id) =>
    SCHOOL_THEMES.find(theme => theme.id === id) || SCHOOL_THEMES[0];
