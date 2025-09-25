/**
 * Facebook OAuth Service
 * Handles Facebook Login with OAuth to get Marketing API Access Token
 */

declare global {
  interface Window {
    FB: any;
  }
}

export interface FacebookOAuthResult {
  success: boolean;
  accessToken?: string;
  userInfo?: {
    id: string;
    name: string;
    email?: string;
  };
  error?: string;
}

class FacebookOAuthService {
  private isSDKLoaded = false;
  private readonly APP_ID: string;
  
  constructor() {
    // Para desenvolvimento/teste, use este App ID público do Facebook
    // Em produção, deve ser configurado com seu próprio App ID
    this.APP_ID = '966242223397117'; // Facebook Test App ID
  }
  
  /**
   * Initialize Facebook SDK
   */
  private async initFacebookSDK(): Promise<void> {
    if (this.isSDKLoaded) return;

    return new Promise((resolve, reject) => {
      // Load Facebook SDK script
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        window.FB.init({
          appId: this.APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        this.isSDKLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Facebook SDK'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Start Facebook OAuth flow to get Marketing API access token
   */
  async startOAuthFlow(): Promise<FacebookOAuthResult> {
    try {
      // Initialize SDK first
      await this.initFacebookSDK();
      return new Promise((resolve) => {
        window.FB.login((response: any) => {
          if (response.authResponse) {
            const { accessToken, userID } = response.authResponse;
            
            // Get user info
            window.FB.api('/me', { fields: 'name,email' }, (userResponse: any) => {
              resolve({
                success: true,
                accessToken,
                userInfo: {
                  id: userID,
                  name: userResponse.name,
                  email: userResponse.email
                }
              });
            });
          } else {
            resolve({
              success: false,
              error: 'Login cancelado ou falhou'
            });
          }
        }, {
          scope: 'public_profile,email',
          return_scopes: true,
          auth_type: 'rerequest'
        });
      });

    } catch (error) {
      return {
        success: false,
        error: 'Erro ao inicializar Facebook OAuth'
      };
    }
  }

  /**
   * Check if Facebook SDK is ready
   */
  async ensureSDKReady(): Promise<boolean> {
    try {
      await this.initFacebookSDK();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const facebookOAuthService = new FacebookOAuthService();