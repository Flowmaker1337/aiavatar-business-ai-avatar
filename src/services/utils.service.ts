export class UtilsService {
    static formatStringMap(map?: Record<string, string>): string {
        if (!map || Object.keys(map).length === 0) {
            return 'mapa jest pusta';
        }

        return Object.entries(map)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }

    static isIntegerString(str: string) {
        return /^-?\d+$/.test(str);
    }
}