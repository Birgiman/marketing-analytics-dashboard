// ========================================================================================
// UTILITÁRIO DE CRIPTOGRAFIA - APENAS PARA USO INTERNO DAS EDGE FUNCTIONS
// ========================================================================================

/**
 * Utilitário de criptografia AES-256-GCM para tokens sensíveis
 * SEGURANÇA: Este código roda apenas no ambiente seguro da Edge Function
 * 
 * @example
 * ```typescript
 * import { TokenCrypto } from '../_shared/token-crypto.ts';
 * 
 * // Criptografar
 * const encrypted = await TokenCrypto.encryptToken(plainToken);
 * 
 * // Descriptografar com verificação
 * let token = encryptedToken;
 * if (TokenCrypto.isEncrypted(token)) {
 *   token = await TokenCrypto.decryptToken(token);
 * }
 * ```
 */
export class TokenCrypto {
  private static cryptoKey: CryptoKey | null = null;

  private static async getCryptoKey(): Promise<CryptoKey> {
    if (this.cryptoKey) {
      return this.cryptoKey;
    }

    // @ts-ignore
    const secretKey = Deno.env.get('AES_SECRET_KEY');

    if (!secretKey) {
      throw new Error('Chave de criptografia não encontrada no environment');
    }

    const keyData = new TextEncoder().encode(secretKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    return this.cryptoKey;
  }

  /**
   * Criptografa um token usando AES-256-GCM
   * @param plaintext Token em texto plano
   * @returns Token criptografado como JSON string
   */
  static async encryptToken(plaintext: string): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(plaintext);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        key,
        data
      );

      const encryptedArray = new Uint8Array(encrypted);
      const encryptedData = encryptedArray.slice(0, -16);
      const tag = encryptedArray.slice(-16);

      return JSON.stringify({
        encrypted: btoa(String.fromCharCode(...encryptedData)),
        iv: btoa(String.fromCharCode(...iv)),
        tag: btoa(String.fromCharCode(...tag))
      });
    } catch (error) {
      throw new Error(`[TokenCrypto] Falha na criptografia: ${error.message}`);
    }
  }

  /**
   * Descriptografa um token criptografado com AES-256-GCM
   * @param encryptedString Token criptografado como JSON string
   * @returns Token em texto plano
   */
  static async decryptToken(encryptedString: string): Promise<string> {
    try {
      const key = await this.getCryptoKey();
      const { encrypted, iv, tag } = JSON.parse(encryptedString);

      const ivArray = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
      const encryptedArray = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
      const tagArray = new Uint8Array(atob(tag).split('').map(c => c.charCodeAt(0)));

      const combinedData = new Uint8Array(encryptedArray.length + tagArray.length);
      combinedData.set(encryptedArray, 0);
      combinedData.set(tagArray, encryptedArray.length);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray, tagLength: 128 },
        key,
        combinedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error(`[TokenCrypto] Falha na descriptografia: ${error.message}`);
    }
  }

  /**
   * Verifica se um valor está criptografado
   * @param value String a verificar
   * @returns true se o valor está no formato criptografado
   */
  static isEncrypted(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return !!(parsed.encrypted && parsed.iv && parsed.tag);
    } catch {
      return false;
    }
  }
}

