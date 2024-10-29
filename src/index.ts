import yargs from 'yargs/yargs';
import { getDepositInformation, getRetryableTicketsInDateRange } from './subgraph';
import { DEFAULT_DAYS_TO_PROCESS, REDEMPTION_SAFE_TIME_WINDOW_IN_SECONDS } from './constants';
import { RetryableTicketInformation, SubgraphRetryableInformation } from './types';
import { getTokenPrice } from './coingecko';
import { formatEther, formatUnits } from 'viem';
import dotenv from 'dotenv';
import { exportCsvFileWithRetryablesInformation } from './csvUtils';
dotenv.config();

type RetryablesAnalysisParameters = {
  fromDate: Date;
  toDate: Date;
};

const main = async ({ fromDate, toDate }: RetryablesAnalysisParameters) => {
  if (!process.env.RETRYABLES_GRAPH_URL || !process.env.BRIDGE_GRAPH_URL) {
    console.error(
      `RETRYABLES_GRAPH_URL and BRIDGE_GRAPH_URL env variables are needed to run this script.`,
    );
    return;
  }

  console.log(`Analyzing retryables from ${fromDate} to ${toDate}`);
  const fromDateSeconds = Math.floor(fromDate.getTime() / 1000);
  const toDateSeconds = Math.floor(toDate.getTime() / 1000);

  // Getting all retryables
  const retryableTicketsRaw = await getRetryableTicketsInDateRange(
    fromDateSeconds,
    toDateSeconds,
    process.env.RETRYABLES_GRAPH_URL,
  );
  if (!retryableTicketsRaw || retryableTicketsRaw.length <= 0) {
    console.log('No retryable tickets were found for that period');
    return;
  }

  // Find the ones that expired and the ones that were not redeemed within the allowed time window
  const retryablesExpired: SubgraphRetryableInformation[] = [];
  const retryablesWithFundsAtRisk: SubgraphRetryableInformation[] = [];

  retryableTicketsRaw.map((retryableTicket: SubgraphRetryableInformation) => {
    if (!retryableTicket.redeemedAtTimestamp) {
      retryablesExpired.push(retryableTicket);
      return;
    }

    if (
      Number(retryableTicket.redeemedAtTimestamp) >=
      Number(retryableTicket.createdAtTimestamp) + REDEMPTION_SAFE_TIME_WINDOW_IN_SECONDS
    ) {
      retryablesWithFundsAtRisk.push(retryableTicket);
      return;
    }
  });

  // Initializing information object
  const retryableTicketsInformation: RetryableTicketInformation[] = [];

  // Processing expired tickets
  await Promise.all(
    retryablesExpired.map(async (retryableTicket: SubgraphRetryableInformation) => {
      const ticketCreationDate = new Date(Number(retryableTicket.createdAtTimestamp) * 1000);

      // Get USD value from Coingecko
      const callValueEth = Number(formatEther(BigInt(retryableTicket.callvalue)));
      const etherValueUsd = await getTokenPrice(
        'ethereum',
        Number(retryableTicket.createdAtTimestamp),
      );

      const retryableTicketInformation: RetryableTicketInformation = {
        date: ticketCreationDate,
        status: 'Expired',
        redeemedAt: undefined,
        callValueEth,
        callValueUsd: callValueEth * etherValueUsd,
      };

      // Checking if the retryable is sending tokens in it (through the canonical bridge)
      const depositInformation = await getDepositInformation(
        retryableTicket.createdAtTxHash,
        process.env.BRIDGE_GRAPH_URL!,
      );

      // It is a deposit
      if (depositInformation) {
        retryableTicketInformation.tokenAddress = depositInformation.l1Token.id;
        retryableTicketInformation.tokenAmount = Number(
          formatUnits(
            BigInt(depositInformation.tokenAmount),
            Number(depositInformation.l1Token.decimals),
          ),
        );

        // Get USD value from Coingecko
        const tokenValueUsd = await getTokenPrice(
          depositInformation.l1Token.id,
          Number(depositInformation.timestamp),
        );

        if (tokenValueUsd) {
          retryableTicketInformation.tokenValueUsd =
            retryableTicketInformation.tokenAmount * tokenValueUsd;
        }
      }

      retryableTicketsInformation.push(retryableTicketInformation);
    }),
  );

  // Processing tickets with funds at risk
  await Promise.all(
    retryablesWithFundsAtRisk.map(async (retryableTicket: SubgraphRetryableInformation) => {
      const ticketCreationDate = new Date(Number(retryableTicket.createdAtTimestamp) * 1000);
      const ticketRedemptionDate = new Date(Number(retryableTicket.redeemedAtTimestamp) * 1000);

      // Get USD value from Coingecko
      const callValueEth = Number(formatEther(BigInt(retryableTicket.callvalue)));
      const etherValueUsd = await getTokenPrice(
        'ethereum',
        Number(retryableTicket.createdAtTimestamp),
      );

      const retryableTicketInformation: RetryableTicketInformation = {
        date: ticketCreationDate,
        status: 'Redeemed',
        redeemedAt: ticketRedemptionDate,
        callValueEth,
        callValueUsd: callValueEth * etherValueUsd,
      };

      // Checking if the retryable is sending tokens in it (through the canonical bridge)
      const depositInformation = await getDepositInformation(
        retryableTicket.createdAtTxHash,
        process.env.BRIDGE_GRAPH_URL!,
      );

      // It is a deposit
      if (depositInformation) {
        retryableTicketInformation.tokenAddress = depositInformation.l1Token.id;
        retryableTicketInformation.tokenAmount = Number(
          formatUnits(
            BigInt(depositInformation.tokenAmount),
            Number(depositInformation.l1Token.decimals),
          ),
        );

        // Get USD value from Coingecko
        const tokenValueUsd = await getTokenPrice(
          depositInformation.l1Token.id,
          Number(depositInformation.timestamp),
        );

        if (tokenValueUsd) {
          retryableTicketInformation.tokenValueUsd =
            retryableTicketInformation.tokenAmount * tokenValueUsd;
        }
      }

      retryableTicketsInformation.push(retryableTicketInformation);
    }),
  );

  // Export information to CSV
  exportCsvFileWithRetryablesInformation(
    fromDate,
    toDate,
    retryableTicketsInformation,
    __dirname + '/../output',
    'fundsAtRisk',
  );

  // Rendering output
  console.log(retryableTicketsInformation);
};

const options = yargs(process.argv.slice(2))
  .options({
    'from-date': { type: 'string', describe: 'date from where to start fetching information' },
    'to-date': { type: 'string', describe: 'last date to fetch information' },
    'days': {
      type: 'number',
      describe: 'number of days to process (not used if both --from-date and --to-date are used)',
    },
  })
  .parseSync();

// Process dates
const parameters = {
  fromDate: new Date(),
  toDate: new Date(),
};
const days = options['days'] ?? DEFAULT_DAYS_TO_PROCESS;

if (options['from-date'] && options['to-date']) {
  // Case 1: Both from-date and to-date have been specified
  parameters.fromDate = new Date(options['from-date']);
  parameters.toDate = new Date(options['to-date']);
} else if (options['from-date']) {
  // Case 2: Only from-date was specified
  parameters.fromDate = new Date(options['from-date']);
  parameters.toDate = new Date(parameters.fromDate);
  parameters.toDate.setDate(parameters.toDate.getDate() + days);
} else {
  // Case 3: from-date was not specified, we don't know about to-date
  if (options['to-date']) {
    parameters.toDate = new Date(options['to-date']);
    parameters.fromDate = new Date(parameters.toDate);
  }
  parameters.fromDate.setDate(parameters.fromDate.getDate() - days);
}

main(parameters)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
