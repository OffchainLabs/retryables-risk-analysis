import {
  SubgraphRetryableResult,
  SubgraphRetryableInformation,
  SubgraphDepositInformation,
  SubgraphDepositResult,
  SubgraphBridgeRetryableResult,
} from './types';
import dotenv from 'dotenv';
dotenv.config();

async function querySubgraph(
  query: string,
  subgraphUrl: string,
): Promise<SubgraphRetryableResult | SubgraphBridgeRetryableResult | SubgraphDepositResult> {
  const response = await fetch(subgraphUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  return result.data;
}

export const getRetryableTicketsInDateRange = async (
  timestampFrom: number,
  timestampTo: number,
  retryablesSubgraphUrl: string,
): Promise<SubgraphRetryableInformation[] | undefined> => {
  // Query retryables with pagination
  const retryables: SubgraphRetryableInformation[] = [];

  const elementsPerPage = 1000;
  let page = 0;
  let finished = false;

  do {
    const queryRetryables = `
      {
        retryables(
          first: ${elementsPerPage},
          skip: ${elementsPerPage * page},
          where: {
              createdAtTimestamp_gte: "${timestampFrom}",
              createdAtTimestamp_lte: "${timestampTo}"
          }
        ) {
          id
          status
          retryTxHash
          timeoutTimestamp
          createdAtTimestamp
          createdAtBlockNumber
          createdAtTxHash
          redeemedAtTimestamp
          isAutoRedeemed
          sequenceNum
          donatedGas
          gasDonor
          maxRefund
          submissionFeeRefund
          requestId
          l1BaseFee
          deposit
          callvalue
          gasFeeCap
          gasLimit
          maxSubmissionFee
          feeRefundAddress
          beneficiary
          retryTo
          retryData
        }
      }
    `;
    const resultRetryables = (await querySubgraph(
      queryRetryables,
      retryablesSubgraphUrl,
    )) as SubgraphRetryableResult;

    // Adding the obtained results
    retryables.push(...resultRetryables.retryables);

    // Increase page by 1
    page++;

    // Check whether we are finished
    finished = resultRetryables.retryables.length < elementsPerPage;
  } while (!finished);

  return retryables;
};

export const getDepositInformation = async (
  retryableTicketId: string,
  bridgeSubgraphUrl: string,
): Promise<SubgraphDepositInformation | undefined> => {
  // First obtain the L1 transaction hash
  const queryRetryables = `
    {
      retryables(
        where: {
          retryableTicketID: "${retryableTicketId}"
        }
      ) {
        id
        sender
        isEthDeposit
        value
        destAddr
        retryableTicketID
        l2Calldata
        timestamp
        transactionHash
        blockCreatedAt
      }
    }
  `;

  const resultRetryables = (await querySubgraph(
    queryRetryables,
    bridgeSubgraphUrl,
  )) as SubgraphBridgeRetryableResult;

  if (
    !resultRetryables ||
    !resultRetryables.retryables ||
    resultRetryables.retryables.length <= 0
  ) {
    return undefined;
  }

  const bridgeRetryable = resultRetryables.retryables[0];

  // And then query the deposit
  const queryDeposit = `
    {
      deposits(
          where: {
              transactionHash: "${bridgeRetryable.transactionHash}"
          }
      ) {
        id
        type
        sender
        receiver
        ethValue
        l1Token {
            id
            name
            symbol
            decimals
            registeredAtBlock
        }
        sequenceNumber
        l2TicketId
        tokenAmount
        isClassic
        timestamp
        transactionHash
        blockCreatedAt
      }
    }
  `;

  const resultDeposit = (await querySubgraph(
    queryDeposit,
    bridgeSubgraphUrl,
  )) as SubgraphDepositResult;

  return resultDeposit.deposits[0];
};
