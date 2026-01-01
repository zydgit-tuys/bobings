// Custom size sorting logic
// Supports: ALL, OS, 3S, 2S, S, SM, M, L, XL, XXL, XXXL, 4XL, 5XL, 1, 2, 3, etc.

const SIZE_ORDER_MAP: Record<string, number> = {
    'ALL': 0,
    'OS': 1,
    '3S': 2,
    '2S': 3,
    'S': 4,
    'SM': 5,
    'M': 6,
    'L': 7,
    'XL': 8,
    'XXL': 9,
    'XXXL': 10,
    '4XL': 11,
    '5XL': 12,
};

export function sortSizes(sizes: Array<{ id: string; value: string; sort_order: number }>): Array<{ id: string; value: string; sort_order: number }> {
    return [...sizes].sort((a, b) => {
        const aUpper = a.value.toUpperCase().trim();
        const bUpper = b.value.toUpperCase().trim();

        // Check if both are in the predefined order map
        const aOrder = SIZE_ORDER_MAP[aUpper];
        const bOrder = SIZE_ORDER_MAP[bUpper];

        if (aOrder !== undefined && bOrder !== undefined) {
            return aOrder - bOrder;
        }

        // If only 'a' is in the map, it comes first
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;

        // Check if both are numeric
        const aNum = parseInt(aUpper);
        const bNum = parseInt(bUpper);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }

        // If only 'a' is numeric, it comes after non-numeric (except predefined)
        if (!isNaN(aNum)) return 1;
        if (!isNaN(bNum)) return -1;

        // Fallback to alphabetical
        return aUpper.localeCompare(bUpper);
    });
}
