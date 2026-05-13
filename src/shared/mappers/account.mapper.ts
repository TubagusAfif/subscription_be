import { UserWithProfile } from '../repositories/account.repository';

/**
 * Maps account and profile data to an API-friendly structure.
 */
export class AccountMapper {
  /**
   * Formats a user and their profile for the API response.
   */
  static toAccountResponse(user: UserWithProfile) {
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
      createdAt: user.created_at,
      profile: user.profile ? {
        dateOfBirth: user.profile.date_of_birth,
        gender: user.profile.gender,
        addressLine1: user.profile.address_line1,
        addressLine2: user.profile.address_line2,
        city: user.profile.city,
        utcTimezone: user.profile.utc_timezone,
        province: user.profile.province,
        postalCode: user.profile.postal_code,
        country: user.profile.country,
        clinicName: user.profile.clinic_name,
        photoUrl: user.profile.photo_url,
      } : null,
    };
  }
}
