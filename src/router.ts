import { decodeTransactionByHash } from "@3loop/transaction-decoder"
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect, Either } from "effect"
import { Hex } from "viem"
import { interpretTransaction } from "./interpreter"
import { OpenApiRoute, SwaggerUIRoute } from "./swagger"
import { SqlClient } from "@effect/sql"

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
      decodeTransactionByHash(params.hash as Hex, Number(params.chain))
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
    const sql = yield* SqlClient.SqlClient

    const data = yield* HttpServerRequest.schemaBodyJson(
      Schema.Struct({
        address: Schema.String,
        contractName: Schema.String,
        tokenSymbol: Schema.String,
        decimals: Schema.optional(Schema.Number),
        type: Schema.String,
        chainID: Schema.Number,
        status: Schema.Enums({ success: "success" }),
      }),
    )

    yield* sql`
      INSERT INTO contractMeta (address, chain, contractName, tokenSymbol, decimals, type, status)
      VALUES (${data.address}, ${data.chainID}, ${data.contractName}, ${data.tokenSymbol}, ${data.decimals ?? null}, ${data.type}, "success")
    `

    return yield* HttpServerResponse.json({ status: "ok" })
  }),
)

const AddAbi = HttpRouter.post(
  "/add-abi",
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const data = yield* HttpServerRequest.schemaBodyJson(
      Schema.Struct({
        address: Schema.String,
        abi: Schema.String,
      }),
    )

    yield* sql`
      INSERT INTO contractAbi (address, abi)
      VALUES (${data.address}, ${data.abi})
    `

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
  Effect.timeoutFail({
    duration: "10 seconds",
    onTimeout: () => HttpServerResponse.text("timeout"),
  }),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
)
