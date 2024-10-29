import { coingeckoApiMaxAttempts, coingeckoSecondsBetweenAttempts } from './constants';
import { sleep } from './utils';
import dotenv from 'dotenv';
dotenv.config();

export const getTokenPrice = async (tokenAddress: string | 'ethereum', dateTimestamp: number) => {
  if (!process.env.COINGECKO_PRO_API_KEY) {
    console.warn(`COINGECKO_PRO_API_KEY env variable is needed to obtain coin prices.`);
    return 0;
  }

  // URL to fetch
  // (https://docs.coingecko.com/reference/contract-address-market-chart-range)
  const dateFrom = dateTimestamp;
  const dateTo = dateTimestamp + 24 * 60 * 60;
  const url = `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress.toLowerCase()}/market_chart/range?vs_currency=usd&from=${dateFrom}&to=${dateTo}&interval=daily&x_cg_pro_api_key=${process.env.COINGECKO_PRO_API_KEY}`;

  // Querying API
  let result = undefined;
  let attempts = 0;
  while (attempts < coingeckoApiMaxAttempts) {
    try {
      const response = await fetch(url);
      result = await response.json();
      break;
    } catch (error) {
      attempts++;

      if (attempts >= coingeckoApiMaxAttempts) {
        console.error(`Failed to get logs after ${coingeckoApiMaxAttempts} attempts:`, error);
        throw error;
      }

      console.warn(`Attempt ${attempts} failed. Retrying...`);
      await sleep(1000 * (attempts + coingeckoSecondsBetweenAttempts));
    }
  }

  // Error checking
  if (!result) {
    console.log(`No data found for coin ${tokenAddress}`);
    return 0;
  }
  if (!result.prices) {
    console.log(`No prices found for coin ${tokenAddress}`);
    return 0;
  }
  if (!result.prices[0]) {
    console.log(`No usd price found for coin ${tokenAddress}`);
    return 0;
  }

  return result.prices[0][1];
};
