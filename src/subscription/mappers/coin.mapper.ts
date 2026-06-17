import { CoinCurrency } from '@prisma/client';
import { CoinBundleWithRelations } from '../repositories/bundle.repository';

/** 
 ---------------------------------------------------------------
  Maps Coin Master Data entities into API-friendly responses.
 ---------------------------------------------------------------
**/
export class CoinMapper {
  static toCurrencyResponse(currency: CoinCurrency) {
    return {
      id: currency.id,
      currency_name: currency.currency_name,
      currency_code: currency.currency_code,
      symbol: currency.symbol,
      conversion_rate: currency.conversion_rate,
      effective_from: currency.effective_from,
      effective_until: currency.effective_until,
      is_active: currency.is_active,
    };
  }

  static toBundleResponse(bundle: CoinBundleWithRelations) {
    return {
      id: bundle.id,
      bundle_name: bundle.bundle_name,
      coin_amount: bundle.coin_amount,
      price: bundle.price,
      discounted_price: bundle.discounted_price,
      tax_rate: bundle.tax_rate,
      is_active: bundle.is_active,
      currency: bundle.currency ? this.toCurrencyResponse(bundle.currency) : null,
    };
  }


}
