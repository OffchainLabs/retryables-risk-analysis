import * as fs from 'fs';
import * as path from 'path';
import { RetryableTicketInformation } from './types';

export const exportCsvFileWithRetryablesInformation = (
  dateFrom: Date,
  dateTo: Date,
  retryablesInformation: RetryableTicketInformation[],
  outDir: string,
  fileName: string,
  separator = ';',
) => {
  // Create directory if it doesn't exist
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  // Sorting data by date
  retryablesInformation.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Separating tickets with funds at risk, from tickets expired
  // and obtaining partial totals
  const retryablesRedeemedInformation = retryablesInformation.filter(
    (retryableInformation: RetryableTicketInformation) =>
      retryableInformation.status === 'Redeemed',
  );
  const retryablesExpiredInformation = retryablesInformation.filter(
    (retryableInformation: RetryableTicketInformation) => retryableInformation.status === 'Expired',
  );

  const totalCallValueEthInRetryablesRedeemed = retryablesRedeemedInformation.reduce(
    (accumulator, currRetryableTicket) => accumulator + currRetryableTicket.callValueEth,
    0,
  );
  const totalCallValueUsdInRetryablesRedeemed = retryablesRedeemedInformation.reduce(
    (accumulator, currRetryableTicket) => accumulator + currRetryableTicket.callValueUsd,
    0,
  );
  const totalCallValueEthInRetryablesExpired = retryablesExpiredInformation.reduce(
    (accumulator, currRetryableTicket) => accumulator + currRetryableTicket.callValueEth,
    0,
  );
  const totalCallValueUsdInRetryablesExpired = retryablesExpiredInformation.reduce(
    (accumulator, currRetryableTicket) => accumulator + currRetryableTicket.callValueUsd,
    0,
  );
  const totalTokensValueUsdInRetryablesRedeemed = retryablesRedeemedInformation.reduce(
    (accumulator, currRetryableTicket) => accumulator + (currRetryableTicket.tokenValueUsd ?? 0),
    0,
  );
  const totalTokensValueUsdInRetryablesExpired = retryablesExpiredInformation.reduce(
    (accumulator, currRetryableTicket) => accumulator + (currRetryableTicket.tokenValueUsd ?? 0),
    0,
  );

  //
  // Generating the CSV file
  //

  // Show totals in the top
  const csvTotalsHeader = [
    'Date from',
    'Date to',
    'Number of tickets with funds at risk',
    'Total callvalue sent in redeemed tickets (ETH)',
    'Total callvalue sent in redeemed tickets ($)',
    'Total callvalue lost (ETH)',
    'Total callvalue lost ($)',
    'Total value of tokens sent in redeemed tickets ($)',
    'Total value of tokens lost ($)',
    'Total $ redeemed',
    'Total $ lost',
    'Total $ at risk',
  ].join(separator);

  const csvTotals = [
    dateFrom.toISOString(),
    dateTo.toISOString(),
    retryablesInformation.length,
    totalCallValueEthInRetryablesRedeemed,
    totalCallValueUsdInRetryablesRedeemed,
    totalCallValueEthInRetryablesExpired,
    totalCallValueUsdInRetryablesExpired,
    totalTokensValueUsdInRetryablesRedeemed,
    totalTokensValueUsdInRetryablesExpired,
    totalCallValueUsdInRetryablesRedeemed + totalTokensValueUsdInRetryablesRedeemed,
    totalCallValueUsdInRetryablesExpired + totalTokensValueUsdInRetryablesExpired,
    totalCallValueUsdInRetryablesRedeemed +
      totalTokensValueUsdInRetryablesRedeemed +
      totalCallValueUsdInRetryablesExpired +
      totalTokensValueUsdInRetryablesExpired,
  ].join(separator);

  // Create header for retryable tickets
  const csvHeader = [
    'Date',
    'Status',
    'Redemption date',
    'callValue (ETH)',
    'callValue ($)',
    'tokens sent',
    'value of tokens sent ($)',
  ].join(separator);

  // Render each retryable tickets
  const csvRetryablesInformation: any = [];
  retryablesInformation.forEach((retryableInformation: RetryableTicketInformation) => {
    csvRetryablesInformation.push(
      [
        retryableInformation.date.toISOString(),
        retryableInformation.status,
        retryableInformation.redeemedAt?.toISOString(),
        retryableInformation.callValueEth,
        retryableInformation.callValueUsd,
        retryableInformation.tokenAmount ?? 0,
        retryableInformation.tokenValueUsd ?? 0,
      ].join(separator),
    );
  });

  // Final CSV result
  const csvResult = [csvTotalsHeader, csvTotals, '', csvHeader, ...csvRetryablesInformation];

  console.log(csvResult);

  // Writing the file
  const retryablesInformationFilename = `${fileName}.csv`;
  fs.writeFileSync(path.join(outDir, retryablesInformationFilename), csvResult.join('\n'));
};
