import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from "@effect/platform"
import { Schema } from "@effect/schema"

const security = HttpApiSecurity.apiKey({
  in: "header",
  key: "x-api-key",
})

class TimeoutError extends Schema.TaggedClass<TimeoutError>()(
  "TimeoutError",
  {},
) { }
class AuthorizationError extends Schema.TaggedClass<AuthorizationError>()(
  "AuthorizationError",
  {},
) { }

export const OrganizationApi = HttpApiGroup.make("organization").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.post("add-metadata", "/add-metadata").pipe(
      HttpApiEndpoint.setSuccess(Schema.Struct({ status: Schema.String })),
      HttpApiEndpoint.setPayload(
        Schema.Struct({
          address: Schema.String,
          contractName: Schema.String,
          tokenSymbol: Schema.optional(Schema.String),
          decimals: Schema.optional(Schema.Number),
          type: Schema.String,
          chainID: Schema.Number,
        }),
      ),
      OpenApi.annotate({
        description: "Manully add contract metadata to the database",
      }),
    ),
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("add-abi", "/add-abi").pipe(
      HttpApiEndpoint.setSuccess(Schema.Struct({ status: Schema.String })),
      HttpApiEndpoint.setPayload(
        Schema.Struct({
          address: Schema.String,
          abi: Schema.String,
          chain: Schema.Number,
        }),
      ),
      OpenApi.annotate({
        description: "Manully add a contract ABI to the database",
      }),
    ),
  ),
  HttpApiGroup.addError(AuthorizationError, { status: 401 }),
  OpenApi.annotate({ security }),
)

export const TransactionApi = HttpApiGroup.make("transaction").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("decode", "/decode/:chain/:hash").pipe(
      HttpApiEndpoint.setPath(
        Schema.Struct({
          chain: Schema.NumberFromString,
          hash: Schema.String,
        }),
      ),
      OpenApi.annotate({
        description: "Decode transaction",
      }),
    ),
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("interpret", "/interpret/:chain/:hash").pipe(
      HttpApiEndpoint.setPath(
        Schema.Struct({
          chain: Schema.NumberFromString,
          hash: Schema.String,
        }),
      ),
      OpenApi.annotate({
        title: "Interpret transaction",
      }),
    ),
  ),
)

const GlobalRoute = HttpApiGroup.make("global").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("supported-chains", "/supported-chains").pipe(
      HttpApiEndpoint.setSuccess(
        Schema.Struct({
          chains: Schema.Array(
            Schema.Struct({
              chainId: Schema.Number,
              name: Schema.String,
            }),
          ),
        }),
      ),
      OpenApi.annotate({
        description: "List supported chains and their ids",
      }),
    ),
  ),
)

// NOTE: We use this now only for openapi generation
export class Api extends HttpApi.empty.pipe(
  HttpApi.addGroup(GlobalRoute),
  HttpApi.addGroup(OrganizationApi),
  HttpApi.addGroup(TransactionApi),
  HttpApi.addError(TimeoutError, { status: 408 }),
  OpenApi.annotate({ title: "Loop Decoder REST API" }),
) { }
