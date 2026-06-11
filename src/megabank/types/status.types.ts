export interface MegaBankStatusResponseItem {
  id: string;
  createdTime: string;
  updatedTime: string;
  currency: string;
  amount: number;
  type: string;
  paymentSource: string;
  status: string;
  statusCode: string;
  statusData: {
    authenticationModule: string;
    challengeAuthenticationCode?: string;
    processingCode?: string;
    authenticationCode?: string;
    cardType: string;
    cardNetwork?: string;
    message: string;
  };
}
