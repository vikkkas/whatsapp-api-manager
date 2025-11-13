export declare function encrypt(text: string): string;
export declare function decrypt(encryptedData: string): string;
export declare function hashPassword(password: string): Promise<string>;
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
declare const _default: {
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    hashPassword: typeof hashPassword;
    comparePassword: typeof comparePassword;
};
export default _default;
//# sourceMappingURL=encryption.d.ts.map