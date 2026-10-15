export const resolveImageUrl = (photoPath, fallback) => {
    if (!photoPath) return fallback;

    // If it's a full URL (Google picture) or base64 data URL, return it as is
    if (photoPath.startsWith('http') || photoPath.startsWith('data:')) {
        return photoPath;
    }

    // Otherwise, assume it's a relative path from the server
    // VITE_API_URL is typically http://localhost:5000/api/
    // We need the server root, which is http://localhost:5000
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const serverRoot = apiUrl.replace(/\/api\/?$/, '');

    // Ensure no double slashes
    const cleanServerRoot = serverRoot.endsWith('/') ? serverRoot.slice(0, -1) : serverRoot;
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;

    return `${cleanServerRoot}${cleanPath}`;
};
