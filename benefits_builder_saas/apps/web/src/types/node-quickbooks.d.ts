declare module 'node-quickbooks' {
  export default class QuickBooks {
    constructor(
      consumerKey: string,
      consumerSecret: string,
      oauthToken: string,
      oauthTokenSecret: string | boolean,
      realmId: string,
      useSandbox: boolean,
      debug?: boolean,
      minorversion?: number | null,
      oauthversion?: string,
      refreshToken?: string
    );

    // Static methods
    static refreshAccessToken(
      refreshToken: string,
      clientId: string,
      clientSecret: string,
      callback: (err: any, data: any) => void
    ): void;

    static authorizeUrl(
      clientId: string,
      redirectUri: string,
      scope: string
    ): string;

    static createToken(
      redirectUri: string,
      authCode: string,
      clientId: string,
      clientSecret: string,
      callback: (err: any, data: any) => void
    ): void;

    // Instance methods
    createCustomer(customer: any, callback: (err: any, data: any) => void): void;
    createInvoice(invoice: any, callback: (err: any, data: any) => void): void;
    createPayment(payment: any, callback: (err: any, data: any) => void): void;
    findCustomers(criteria: any, callback: (err: any, data: any) => void): void;
    getCompanyInfo(realmId: string, callback: (err: any, data: any) => void): void;

    // Add other methods as needed
    [key: string]: any;
  }
}
