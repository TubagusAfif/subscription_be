import { WebhookProcessorService } from '../webhook-processor.service';
import { CoinOrderService } from '../../../client/services/coin-order.service';
import { MegaBankPaymentService } from '../mega-bank-payment.service';
import { MegaBankWebhookPayload } from '../../types/webhook.types';

describe('WebhookProcessorService', () => {
  let webhookProcessor: WebhookProcessorService;
  let mockCoinOrderService: jest.Mocked<CoinOrderService>;
  let mockPaymentService: jest.Mocked<MegaBankPaymentService>;

  beforeEach(() => {
    mockCoinOrderService = {
      handlePaymentSuccess: jest.fn(),
      handlePaymentFailure: jest.fn(),
    } as any;

    mockPaymentService = {
      isPaymentSuccess: jest.fn(),
      isPaymentFailure: jest.fn(),
    } as any;

    webhookProcessor = new WebhookProcessorService({
      coinOrderService: mockCoinOrderService,
      megaBankPaymentService: mockPaymentService,
    });
  });

  const basePayload: MegaBankWebhookPayload = {
    type: 'TRANSACTION_STATUS_UPDATED',
    inquiry: { order: { id: 'COIN-123' }, amount: 100, currency: 'IDR', id: 'inq_123', paymentSource: 'va' },
    transaction: { id: 'tx_123', status: 'pending', statusCode: '01', externalId: 'ext_123' },
  };

  it('should call handlePaymentSuccess when payment is successful', async () => {
    mockPaymentService.isPaymentSuccess.mockReturnValue(true);
    
    await webhookProcessor.processWebhook(basePayload);
    
    expect(mockCoinOrderService.handlePaymentSuccess).toHaveBeenCalledWith('COIN-123');
    expect(mockCoinOrderService.handlePaymentFailure).not.toHaveBeenCalled();
  });

  it('should call handlePaymentFailure when payment fails', async () => {
    mockPaymentService.isPaymentSuccess.mockReturnValue(false);
    mockPaymentService.isPaymentFailure.mockReturnValue(true);
    
    await webhookProcessor.processWebhook(basePayload);
    
    expect(mockCoinOrderService.handlePaymentFailure).toHaveBeenCalledWith('COIN-123');
    expect(mockCoinOrderService.handlePaymentSuccess).not.toHaveBeenCalled();
  });

  it('should ignore pending or processing statuses without changing state', async () => {
    mockPaymentService.isPaymentSuccess.mockReturnValue(false);
    mockPaymentService.isPaymentFailure.mockReturnValue(false);
    
    await webhookProcessor.processWebhook(basePayload);
    
    expect(mockCoinOrderService.handlePaymentSuccess).not.toHaveBeenCalled();
    expect(mockCoinOrderService.handlePaymentFailure).not.toHaveBeenCalled();
  });
});
