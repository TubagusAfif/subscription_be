import nodemailer from 'nodemailer';
import ejs from 'ejs';
import { MailService } from '../../../shared/services/mail.service';

jest.mock('nodemailer');
jest.mock('ejs');

describe('MailService', () => {
  let mailService: MailService;
  const mockSendMail = jest.fn();

  const user = { name: 'John Doe', email: 'john@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
    (ejs.renderFile as unknown as jest.Mock).mockResolvedValue('<html>rendered</html>');
    mockSendMail.mockResolvedValue({ messageId: 'abc' });

    mailService = new MailService();
  });

  it('should create a nodemailer transport on construction', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
  });

  describe('sendActivationEmail', () => {
    it('should render the activation template and send the email', async () => {
      await mailService.sendActivationEmail(user, 'activation-token-123');

      expect(ejs.renderFile).toHaveBeenCalledWith(
        expect.stringContaining('client-activation-mail.ejs'),
        expect.objectContaining({
          user,
          activationLink: expect.stringContaining('token=activation-token-123'),
        }),
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'Activate Your Account',
          html: '<html>rendered</html>',
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should render the reset template and send the email', async () => {
      await mailService.sendPasswordResetEmail(user, 'reset-token-xyz');

      expect(ejs.renderFile).toHaveBeenCalledWith(
        expect.stringContaining('client-reset-password-mail.ejs'),
        expect.objectContaining({
          resetLink: expect.stringContaining('token=reset-token-xyz'),
        }),
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Reset Your Password', to: 'john@example.com' }),
      );
    });
  });

  describe('sendExpiryWarningEmail', () => {
    it('should pluralize the subject for multiple days before expiry', async () => {
      await mailService.sendExpiryWarningEmail(user, 3, 'Gold');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Reminder: Your Gold Subscription Expires in 3 Days',
        }),
      );
    });

    it('should use the singular day form when exactly 1 day before', async () => {
      await mailService.sendExpiryWarningEmail(user, 1, 'Gold');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Reminder: Your Gold Subscription Expires in 1 Day',
        }),
      );
    });

    it('should use the "Expires Today" subject when daysBefore is 0', async () => {
      await mailService.sendExpiryWarningEmail(user, 0, 'Gold');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Action Required: Your Gold Subscription Expires Today',
        }),
      );
    });

    it('should use the grace-period subject when daysBefore is -1', async () => {
      await mailService.sendExpiryWarningEmail(user, -1, 'Gold');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Notice: Your Gold Subscription is in Grace Period',
        }),
      );
    });

    it('should use the grace-ended subject when daysBefore is -7', async () => {
      await mailService.sendExpiryWarningEmail(user, -7, 'Gold');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Alert: Your Gold Subscription Grace Period Ended',
        }),
      );
    });

    it('should render the expiry template with the provided context', async () => {
      await mailService.sendExpiryWarningEmail(user, 3, 'Gold');

      expect(ejs.renderFile).toHaveBeenCalledWith(
        expect.stringContaining('client-expiry-warning-mail.ejs'),
        expect.objectContaining({ user, daysBefore: 3, skuName: 'Gold' }),
      );
    });
  });
});
