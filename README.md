# Decoder REST API

This project provides a REST API to decode EVM transactions. It is built on top of the [Loop Decoder](https://github.com/3loop/loop-decoder) library.

The service has two main API endpoints:

1. **Decoding Endpoint** `/decode/:chain/:hash` - This endpoint returns detailed information about a transaction, including:

   - Decoded transaction data
   - Events and traces
   - Errors, if any
   - Additional context, such as transfers and metadata for all addresses involved in the transaction

2. **Interpreting Endpoint** `/interpret/:chain/:hash` - This endpoint provides a human-readable version of the decoded transaction data, making it easier to understand.

For a more detailed API overview, please refer to the openapi through the `/swagger` endpoint.

## Database

This project uses SQLite as its database. At a minimum, you need to provide the WETH contract metadata. Other public contracts can be resolved using third-party strategies.

If you need a database snapshot for Ethereum Mainnet that includes common contracts metadata and contracts ABIs, please contact us on [X](https://x.com/3loop_io).

## Requirements

To use this project you need to have [Bun](https://bun.sh/) installed on your machine.

## Development

For development, we will use [pnpm](https://pnpm.io/) as our package manager, because Drizzle Kit does not yet support bun sqlite.

Run the migration to create the database:

```bash
$ pnpm migrate
```

Start the development server:

```bash
$ pnpm dev
```

Optionally, start docker-compose to run local telemetry server:

```bash
$ cd ./local && docker-compose up
```

## Deploy with fly.io

Create a volume for sqlite

```bash
$ fly volumes create litefs --size 1
```

Create a new app:

```bash
$ fly launch
```

Configure the consul:

```bash
$ fly consul attach
```
