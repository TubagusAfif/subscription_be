import { TaxConfig } from '@prisma/client';

export class TaxMapper {
  static toResponse(tax: TaxConfig) {
    return {
      id: tax.id,
      tax_name: tax.tax_name,
      tax_value: Number(tax.tax_value),
      tax_type: tax.tax_type,
      is_active: tax.is_active,
      created_at: tax.created_at,
      updated_at: tax.updated_at,
    };
  }
}
