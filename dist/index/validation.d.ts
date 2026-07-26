export declare function requiredString(value: unknown, name: string): string;
export declare function optionalString(value: unknown, name: string): string | undefined;
export declare function boundedInteger(value: unknown, name: string, defaultValue: number, minimum: number, maximum: number): number;
export declare function validRegex(value: string, name: string): string;
