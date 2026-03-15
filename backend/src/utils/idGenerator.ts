export const generateId = (prefix: string): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
    return `${prefix}-${dateStr}-${random}`;
};
