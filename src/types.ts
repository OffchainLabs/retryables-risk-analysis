export type SubgraphRetryableResult = {
  retryables: SubgraphRetryableInformation[];
};

export type SubgraphRetryableInformation = {
  id: string;
  status: string;
  retryTxHash: string;
  timeoutTimestamp: string;
  createdAtTimestamp: string;
  createdAtBlockNumber: string;
  createdAtTxHash: string;
  redeemedAtTimestamp: string;
  isAutoRedeemed: boolean;
  sequenceNum: string;
  donatedGas: string;
  gasDonor: string;
  maxRefund: string;
  submissionFeeRefund: string;
  requestId: string;
  l1BaseFee: string;
  deposit: string;
  callvalue: string;
  gasFeeCap: string;
  gasLimit: string;
  maxSubmissionFee: string;
  feeRefundAddress: string;
  beneficiary: string;
  retryTo: string;
  retryData: string;
};

export type SubgraphBridgeRetryableResult = {
  retryables: SubgraphBridgeRetryableInformation[];
};

export type SubgraphBridgeRetryableInformation = {
  id: string;
  sender: string;
  isEthDeposit: boolean;
  value: string;
  destAddr: string;
  retryableTicketID: string;
  l2Calldata: string;
  timestamp: string;
  transactionHash: string;
  blockCreatedAt: string;
};

export type SubgraphDepositResult = {
  deposits: SubgraphDepositInformation[];
};

export type SubgraphDepositInformation = {
  id: string;
  type: string;
  sender: string;
  receiver: string;
  ethValue: string;
  l1Token: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
    registeredAtBlock: string;
  };
  sequenceNumber: string;
  l2TicketId: string;
  tokenAmount: string;
  isClassic: boolean;
  timestamp: string;
  transactionHash: string;
  blockCreatedAt: string;
};

export type RetryableTicketInformation = {
  date: Date;
  redeemedAt: Date | undefined;
  status: 'Redeemed' | 'Expired';
  callValueEth: number;
  callValueUsd: number;
  tokenAddress?: string;
  tokenAmount?: number;
  tokenValueUsd?: number;
};
