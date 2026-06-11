export interface MegaBankInquiryRequest {
  amount: number;
  currency: string;
  referenceUrl: string;
  order: {
    id: string;
  };
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    country?: string;
    postalCode?: string;
  };
  paymentSourceMethod?: string;
  paymentSource: string;
}

export interface MegaBankInquiryResponse {
  id: string;
  createdTime: string;
  referenceId: string;
  status: string;
  amount: number;
  currency: string;
  paymentSources: string[];
  paymentSourceMethod: string;
  urls: {
    selections: string;
    checkout: string;
  };
  accountRef: string;
  responseCode: string;
  responseDesc: string;
}
