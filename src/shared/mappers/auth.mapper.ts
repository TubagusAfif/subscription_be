import { User } from '@prisma/client';

/** 
---------------------------------------------------------------
  Maps authentication and user data to an API-friendly structure.
---------------------------------------------------------------
**/
export class AuthMapper {
  /** 
  ---------------------------------------------------------------
    Formats an authenticated user and their tokens for the API response.
  ---------------------------------------------------------------
  **/
  static toAuthResponse(user: Partial<User>, tokens: any) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      tokens,
    };
  }

  /** 
  ---------------------------------------------------------------
    Formats the token refresh response.
  ---------------------------------------------------------------
  **/
  static toTokenResponse(tokens: any) {
    return {
      tokens,
    };
  }
}
