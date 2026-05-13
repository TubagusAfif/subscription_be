import { ClientSubscriptionService } from '../../../client/services/subscription.service';
import { AppError } from '../../../shared/middlewares/error.middleware';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------
const mockSubscriptionRepo = {
  findById: jest.fn(),
  executePlanSwitchTransaction: jest.fn(),
} as any;

const mockWalletService = {
  getWallet: jest.fn(),
  spend: jest.fn(),
} as any;

const mockPlanRepo = {
  findById: jest.fn(),
  findBenefitsBySkuId: jest.fn(),
} as any;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const makeSubscription = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  sku_id: 10,
  sku_type: 'PACKAGE',
  status: 'ACTIVE',
  ...overrides,
});

const makeSku = (overrides = {}) => ({
  id: 20,
  sku_type: 'PACKAGE',
  rank: 2,
  is_active: true,
  coin_cost: 100,
  billing_duration_days: 30,
  sku_name: 'Pro Plan',
  ...overrides,
});

const makeWallet = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  balance: 500,
  currency_id: 1,
  ...overrides,
});

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------
describe('ClientSubscriptionService - switchPlan', () => {
  let service: ClientSubscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientSubscriptionService({
      subscriptionRepository: mockSubscriptionRepo,
      coinWalletService: mockWalletService,
      planRepository: mockPlanRepo,
    });
  });

  it('should successfully switch from a lower rank plan to a higher rank plan (UPGRADE)', async () => {
    // Arrange
    const oldSub = makeSubscription({ id: 1, sku: { rank: 1 } });
    const newSku = makeSku({ id: 20, rank: 2, coin_cost: 100 });
    const wallet = makeWallet({ balance: 500 });
    const newSubResult = makeSubscription({ id: 2, sku_id: 20 });
    const planSwitchResult = { id: 100 };
    
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(newSku);
    mockWalletService.getWallet.mockResolvedValue(wallet);
    mockSubscriptionRepo.executePlanSwitchTransaction.mockResolvedValue({
      newSubscription: newSubResult,
      planSwitch: planSwitchResult,
    });
    mockWalletService.spend.mockResolvedValue(true);

    // Act
    const result = await service.switchPlan(1, 1, 20);

    // Assert
    expect(mockSubscriptionRepo.findById).toHaveBeenCalledWith(1);
    expect(mockPlanRepo.findById).toHaveBeenCalledWith(20);
    expect(mockWalletService.getWallet).toHaveBeenCalledWith(1);
    expect(mockSubscriptionRepo.executePlanSwitchTransaction).toHaveBeenCalledWith(
      1, // userId
      1, // subscriptionId
      20, // newSkuId
      'PACKAGE',
      100, // coinCost
      expect.any(Date), // billingEnd
      expect.any(String), // purchaseToken
      expect.any(String), // orderNumber
      'UPGRADE', // switchType
      [] // benefits
    );
    expect(mockWalletService.spend).toHaveBeenCalledWith(
      1,
      100,
      'Plan Switch (UPGRADE): Pro Plan',
      2,
      1
    );
    expect(result).toEqual(newSubResult);
  });

  it('should throw SUBSCRIPTION_NOT_FOUND (404) when old subscription does not exist', async () => {
    mockSubscriptionRepo.findById.mockResolvedValue(null);

    await expect(service.switchPlan(1, 999, 20)).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw FORBIDDEN (403) when user does not own the subscription', async () => {
    const oldSub = makeSubscription({ user_id: 2 }); // belongs to user 2
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('should throw SUBSCRIPTION_NOT_ACTIVE (400) when old subscription is not active', async () => {
    const oldSub = makeSubscription({ status: 'CANCELLED' });
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_ACTIVE',
      statusCode: 400,
    });
  });

  it('should throw INVALID_SWITCH_TYPE (400) when old subscription is not a PACKAGE', async () => {
    const oldSub = makeSubscription({ sku_type: 'ADDON' });
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'INVALID_SWITCH_TYPE',
      statusCode: 400,
    });
  });

  it('should throw SKU_NOT_FOUND (404) when new SKU does not exist', async () => {
    const oldSub = makeSubscription();
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(null);

    await expect(service.switchPlan(1, 1, 999)).rejects.toMatchObject({
      code: 'SKU_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw INVALID_NEW_SKU (400) when new SKU is not active', async () => {
    const oldSub = makeSubscription();
    const newSku = makeSku({ is_active: false });
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(newSku);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'INVALID_NEW_SKU',
      statusCode: 400,
    });
  });

  it('should throw INVALID_NEW_SKU (400) when new SKU is an ADDON', async () => {
    const oldSub = makeSubscription();
    const newSku = makeSku({ sku_type: 'ADDON' });
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(newSku);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'INVALID_NEW_SKU',
      statusCode: 400,
    });
  });

  it('should throw ALREADY_ON_PLAN (400) when old and new SKU are the same', async () => {
    const oldSub = makeSubscription({ sku_id: 20 });
    const newSku = makeSku({ id: 20 });
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(newSku);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'ALREADY_ON_PLAN',
      statusCode: 400,
    });
  });

  it('should throw WALLET_NOT_FOUND (404) when user has no wallet', async () => {
    const oldSub = makeSubscription({ sku_id: 10 });
    const newSku = makeSku({ id: 20, coin_cost: 100 });
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(newSku);
    mockWalletService.getWallet.mockResolvedValue(null);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'WALLET_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw INSUFFICIENT_BALANCE (400) when user wallet balance is less than coin cost', async () => {
    const oldSub = makeSubscription({ sku_id: 10 });
    const newSku = makeSku({ id: 20, coin_cost: 100 });
    const wallet = makeWallet({ balance: 50 }); // Less than 100
    mockSubscriptionRepo.findById.mockResolvedValue(oldSub);
    mockPlanRepo.findById.mockResolvedValue(newSku);
    mockWalletService.getWallet.mockResolvedValue(wallet);

    await expect(service.switchPlan(1, 1, 20)).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      statusCode: 400,
    });
  });
});
