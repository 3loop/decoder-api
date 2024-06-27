# Decoder REST API

TODO:

## Requirements

To use this project you need to have bun installed on your machine.

## Development

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
