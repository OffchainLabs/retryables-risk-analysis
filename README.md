# Retryables risk analysis

This repo contains the code needed to analyze funds that have been at risk because of retryable tickets not having been redeemed automatically.

## How to run it

1. Install dependencies

```shell
yarn
```

2. Create .env file and add environment variables

```shell
cp .env.example .env
```

Variables needed:

- COINGECKO_PRO_API_KEY: API key to use Coingecko's API. You need a PRO plan
- RETRYABLES_GRAPH_URL: endpoint to access the subgraph that contains information about retryable tickets
- BRIDGE_GRAPH_URL: endpoint to access the subgraph that contains information about bridged assets

3. Run the script

```shell
yarn run execute
```

## Available options

By default the script will detect the retryable tickets created during the last 90 days. The following options can be used to adjust that time range:

- `from-date`: date from where to start fetching information
- `to-date`: last date to fetch information
- `days`: number of days to process (not used if both --from-date and --to-date are used)
