import { MidtransWebhookProcessorService } from '../../../midtrans/services/midtrans-webhook-processor.service';

describe('MidtransWebhookProcessorService', () => {
  let service: MidtransWebhookProcessorService;

  const mockCoinOrderService = {
    handlePaymentSuccess: jest.fn(),
    handlePaymentFailure: jest.fn(),
  };
  const mockMidtransPaymentService = {
    isPaymentSuccess: jest.fn(),
    isPaymentFailure: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MidtransWebhookProcessorService({
      coinOrderService: mockCoinOrderService as any,
      midtransPaymentService: mockMidtransPaymentService as any,
    });
  });

  it('should ignore notifications without an order_id', async () => {
    await service.processWebhook({ transaction_id: 'tx-1' } as any);

    expect(mockCoinOrderService.handlePaymentSuccess).not.toHaveBeenCalled();
    expect(mockCoinOrderService.handlePaymentFailure).not.toHaveBeenCalled();
  });

  it('should call handlePaymentSuccess with order id, amount, and payment type on success', async () => {
    mockMidtransPaymentService.isPaymentSuccess.mockReturnValue(true);
    mockMidtransPaymentService.isPaymentFailure.mockReturnValue(false);

    await service.processWebhook({
      order_id: 'COIN-1',
      gross_amount: '103900.00',
      payment_type: 'bank_transfer',
    } as any);

    expect(mockCoinOrderService.handlePaymentSuccess).toHaveBeenCalledWith(
      'COIN-1',
      103900,
      'bank_transfer',
    );
    expect(mockCoinOrderService.handlePaymentFailure).not.toHaveBeenCalled();
  });

  it('should call handlePaymentFailure on a failure status', async () => {
    mockMidtransPaymentService.isPaymentSuccess.mockReturnValue(false);
    mockMidtransPaymentService.isPaymentFailure.mockReturnValue(true);

    await service.processWebhook({ order_id: 'COIN-2', gross_amount: '50000' } as any);

    expect(mockCoinOrderService.handlePaymentFailure).toHaveBeenCalledWith('COIN-2');
    expect(mockCoinOrderService.handlePaymentSuccess).not.toHaveBeenCalled();
  });

  it('should take no action on a non-terminal status', async () => {
    mockMidtransPaymentService.isPaymentSuccess.mockReturnValue(false);
    mockMidtransPaymentService.isPaymentFailure.mockReturnValue(false);

    await service.processWebhook({
      order_id: 'COIN-3',
      gross_amount: '50000',
      transaction_status: 'pending',
    } as any);

    expect(mockCoinOrderService.handlePaymentSuccess).not.toHaveBeenCalled();
    expect(mockCoinOrderService.handlePaymentFailure).not.toHaveBeenCalled();
  });
});
