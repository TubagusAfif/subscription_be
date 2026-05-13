import { PaymentGatewayService } from '../../../subscription/services/payment-gateway.service';
import { Prisma } from '@prisma/client';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------
const mockCreateGateway = jest.fn();
const mockFindAllGateways = jest.fn();
const mockFindGatewayById = jest.fn();
const mockUpdateGateway = jest.fn();
const mockRemoveGateway = jest.fn();

const mockGatewayRepository = {
  createGateway: mockCreateGateway,
  findAllGateways: mockFindAllGateways,
  findGatewayById: mockFindGatewayById,
  updateGateway: mockUpdateGateway,
  removeGateway: mockRemoveGateway,
} as any;

/** 
---------------------------------------------------------------
  Unit tests for the PaymentGatewayService business logic.
---------------------------------------------------------------
**/
describe('PaymentGatewayService', () => {
  let service: PaymentGatewayService;
  const adminId = 99;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentGatewayService(mockGatewayRepository);
  });

  describe('Gateways', () => {
    it('should create a gateway config successfully', async () => {
      const payload: Prisma.PaymentGatewayConfigCreateInput = {
        gateway_name: 'Stripe Global',
        provider: 'stripe',
        api_key_ref: 'STRIPE_API_KEY_GLOBAL',
      };

      mockCreateGateway.mockResolvedValue({ id: 1, ...payload });

      const result = await service.createGateway(payload, adminId);

      expect(mockCreateGateway).toHaveBeenCalledWith(
        expect.objectContaining({ ...payload, created_by: adminId }),
      );
      expect(result.id).toBe(1);
    });

    it('should throw GATEWAY_NOT_FOUND if gateway config does not exist for update', async () => {
      mockFindGatewayById.mockResolvedValue(null);

      await expect(service.updateGateway(999, {}, adminId)).rejects.toMatchObject({
        code: 'GATEWAY_NOT_FOUND',
      });
      expect(mockUpdateGateway).not.toHaveBeenCalled();
    });

    it('should throw DUPLICATE_GATEWAY on P2002', async () => {
      const error: any = new Error('Prisma error');
      error.code = 'P2002';
      mockCreateGateway.mockRejectedValue(error);

      await expect(service.createGateway({} as any, adminId)).rejects.toMatchObject({
        code: 'DUPLICATE_GATEWAY',
      });
    });
  });
});
