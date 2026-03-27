import { google, Auth, gmail_v1, calendar_v3 } from 'googleapis';

export class GoogleCredentialManager {
    static async ensureValidCredentials(oauth2Client: Auth.OAuth2Client): Promise<boolean> {
        if (!oauth2Client || !oauth2Client.credentials) {
            console.warn("Credenciais nulas ou não fornecidas");
            return false;
        }

        try {
            const { token } = await oauth2Client.getAccessToken();
            if (token) {
                console.log("✅ Token válido (ou renovado com sucesso)");
                return true;
            }
            return false;
        } catch (error: any) {
            console.error(`Erro ao validar/renovar token: ${error.message}`);
            return false;
        }
    }

    static isCredentialsExpired(oauth2Client: Auth.OAuth2Client): boolean {
        if (!oauth2Client || !oauth2Client.credentials) return true;

        const expiryDate = oauth2Client.credentials.expiry_date;
        if (!expiryDate) return false;

        return Date.now() >= expiryDate;
    }
}

export class GoogleServiceFactory {
    static async getGmailService(oauth2Client: Auth.OAuth2Client): Promise<gmail_v1.Gmail | null> {
        const isValid = await GoogleCredentialManager.ensureValidCredentials(oauth2Client);
        if (!isValid) {
            console.error("Credenciais inválidas para o Gmail");
            return null;
        }

        return google.gmail({ version: 'v1', auth: oauth2Client });
    }

    static async getCalendarService(oauth2Client: Auth.OAuth2Client): Promise<calendar_v3.Calendar | null> {
        const isValid = await GoogleCredentialManager.ensureValidCredentials(oauth2Client);
        if (!isValid) return null;

        return google.calendar({ version: 'v3', auth: oauth2Client });
    }
}
