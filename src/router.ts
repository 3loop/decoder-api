import { decodeTransactionByHash } from "@3loop/transaction-decoder"
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Schema } from "@effect/schema"
import { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite"
import { Effect, Either } from "effect"
import { Hex } from "viem"
import { contractAbiTable, contractMetaTable } from "./db/schema"
import { interpretTransaction } from "./interpreter"
import { OpenApiRoute, SwaggerUIRoute } from "./swagger"

const GetRoute = HttpRouter.get(
  "/",
  Effect.gen(function* () {
    return yield* HttpServerResponse.text("ok")
  }),
)

const DecodeRoute = HttpRouter.get(
  "/decode/:chain/:hash",
  Effect.gen(function* () {
    const params = yield* HttpRouter.params

    if (isNaN(Number(params.chain)) || params.hash == null) {
      return yield* HttpServerResponse.json(
        {
          error: "Missing required parameters",
        },
        {
          status: 400,
        },
      )
    }

    const decoded = yield* Effect.either(
      decodeTransactionByHash(params.hash as Hex, Number(params.chain)),
    )

    if (Either.isLeft(decoded)) {
      yield* Effect.logError("Decode failed", decoded.left)
      return yield* HttpServerResponse.json(
        {
          error: "Failed to decode transaction",
        },
        {
          status: 400,
        },
      )
    }

    return yield* HttpServerResponse.json(decoded.right)
  }),
)

const InterpretRoute = HttpRouter.get(
  "/interpret/:chain/:hash",
  Effect.gen(function* () {
    const params = yield* HttpRouter.params

    if (isNaN(Number(params.chain)) || params.hash == null) {
      return yield* HttpServerResponse.json(
        {
          error: "Missing required parameters",
        },
        {
          status: 400,
        },
      )
    }

    const decoded = yield* Effect.either(
      decodeTransactionByHash(params.hash as Hex, Number(params.chain)),
    )

    if (Either.isLeft(decoded)) {
      yield* Effect.logError("Decode failed", decoded.left)
      return yield* HttpServerResponse.json(
        {
          error: "Failed to decode transaction",
        },
        {
          status: 400,
        },
      )
    }

    const result = yield* interpretTransaction(decoded.right)
    return yield* HttpServerResponse.json(result)
  }),
)

const SupportedChainsRoute = HttpRouter.get(
  "/supported-chains",
  Effect.gen(function* () {
    return yield* HttpServerResponse.json({
      chains: [
        { chainId: 1, name: "Ethereum" },
        {
          chainId: 11155111,
          name: "Ethereum Sepolia Testnet",
        },
      ],
    })
  }),
)

// TODO: add authorization
const AddMetadata = HttpRouter.post(
  "/add-metadata",
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle

    const data = yield* HttpServerRequest.schemaBodyJson(
      Schema.Struct({
        address: Schema.String,
        contractName: Schema.String,
        tokenSymbol: Schema.String,
        decimals: Schema.optional(Schema.Number),
        type: Schema.String,
        chainID: Schema.Number,
      }),
    )

    yield* db.insert(contractMetaTable).values({
      address: data.address,
      contractName: data.contractName,
      tokenSymbol: data.tokenSymbol,
      decimals: data.decimals,
      type: data.type,
      chain: data.chainID,
    })

    return yield* HttpServerResponse.json({ status: "ok" })
  }),
)

const AddAbi = HttpRouter.post(
  "/add-abi",
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle

    const data = yield* HttpServerRequest.schemaBodyJson(
      Schema.Struct({
        address: Schema.String,
        abi: Schema.String,
      }),
    )

    yield* db.insert(contractAbiTable).values({
      address: data.address,
      abi: data.abi,
    })

    return yield* HttpServerResponse.json({ status: "ok" })
  }),
)

export const HttpLive = HttpRouter.empty.pipe(
  GetRoute,
  DecodeRoute,
  InterpretRoute,
  AddMetadata,
  AddAbi,
  SwaggerUIRoute,
  OpenApiRoute,
  SupportedChainsRoute,
  HttpRouter.get("/ping", Effect.succeed(HttpServerResponse.text("pong"))),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
)
