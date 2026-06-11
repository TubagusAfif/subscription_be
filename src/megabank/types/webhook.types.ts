export interface MegaBankWebhookTransaction {
  id: string;
  createdTime: string;
  updatedTime: string;
  currency: string;
  amount: number;
  inquiryId: string;
  merchantId: string;
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
  networkRefId: string;
}

export interface MegaBankWebhookInquiry {
  id: string;
  createdTime: string;
  updatedTime: string;
  merchantId: string;
  currency: string;
  amount: number;
  lockedAmount: number;
  status: string;
  order: {
    id: string;
    disablePromo?: boolean;
  };
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    country: string;
    postalCode: string;
    alloPoint?: number;
    alloBalance?: number;
    alloCreditLimit?: number;
  };
  merchant: {
    id: string;
    name: string;
    status: string;
    partnerId?: string | null;
  };
}

export interface MegaBankWebhookPayload {
  type: string;
  transaction: MegaBankWebhookTransaction;
  inquiry: MegaBankWebhookInquiry;
}
