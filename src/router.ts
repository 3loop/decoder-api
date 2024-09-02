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
import { Authorization, authorizationMiddleware } from "./authorization"

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

    const result = yield* Effect.either(interpretTransaction(decoded.right))

    if (Either.isLeft(result)) {
      yield* Effect.logError("Interpret failed", result.left)
      return yield* HttpServerResponse.json(
        {
          error: "Failed to interpret transaction",
        },
        {
          status: 400,
        },
      )
    }

    return yield* HttpServerResponse.json(result.right)
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

const AddMetadata = HttpRouter.post(
  "/add-metadata",
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const auth = yield* Authorization

    yield* auth.isAuthorized

    const data = yield* HttpServerRequest.schemaBodyJson(
      Schema.Struct({
        address: Schema.String,
        contractName: Schema.String,
        tokenSymbol: Schema.optional(Schema.String),
        decimals: Schema.optional(Schema.Number),
        type: Schema.String,
        chainID: Schema.Number,
      }),
    )

    yield* sql`
      INSERT INTO contractMeta (address, chain, contractName, tokenSymbol, decimals, type, status)
      VALUES (${data.address}, ${data.chainID}, ${data.contractName}, ${data.tokenSymbol ?? null}, ${data.decimals ?? null}, ${data.type}, "success")
    `

    return yield* HttpServerResponse.json({ status: "ok" })
  }),
)

const AddAbi = HttpRouter.post(
  "/add-abi",
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const auth = yield* Authorization

    yield* auth.isAuthorized

    const data = yield* HttpServerRequest.schemaBodyJson(
      Schema.Struct({
        address: Schema.String,
        abi: Schema.String,
        chain: Schema.Number,
      }),
    )

    // TODO: Validate ABI
    yield* sql`
      INSERT INTO contractAbi (address, chain, abi, type, status)
      VALUES (${data.address}, ${data.chain}, ${data.abi}, "address", "success")
    `

    return yield* HttpServerResponse.json({ status: "ok" })
  }),
)

const HealthRoute = HttpRouter.get(
  "/ping",
  Effect.succeed(HttpServerResponse.text("pong")),
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
  HealthRoute,
  HttpRouter.use(authorizationMiddleware),
  Effect.timeoutFail({
    duration: "10 seconds",
    onTimeout: () =>
      HttpServerResponse.text("timeout", {
        status: 408,
      }),
  }),
  Effect.catchTag("AuthorizationError", (error) =>
    Effect.gen(function* () {
      return HttpServerResponse.text(error.message, {
        status: 401,
      })
    }),
  ),
  Effect.catchTag("RouteNotFound", () =>
    Effect.gen(function* () {
      return HttpServerResponse.text("Not Found", {
        status: 404,
      })
    }),
  ),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError("Error", error)
      return HttpServerResponse.text("Error", {
        status: 500,
      })
    }),
  ),
  Effect.catchAllDefect((defect) =>
    Effect.gen(function* () {
      yield* Effect.logError("Defect", defect)
      return HttpServerResponse.text("Defect", {
        status: 500,
      })
    }),
  ),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
)
