import { HttpRouter, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { summary } from "effect/MetricState"
import { get } from "effect/Record"

const title = "Swagger UI"
const CDN_BASE = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@^5"

const SwaggerHtml = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="${title}" />
        <title>${title}</title>
        <link rel="stylesheet" href="${CDN_BASE}/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="${CDN_BASE}/swagger-ui-bundle.js" crossorigin></script>
        <script
          src="${CDN_BASE}/swagger-ui-standalone-preset.js"
          crossorigin
        ></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: "./openapi.json",
              dom_id: "#swagger-ui",
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset,
              ],
              layout2: "StandaloneLayout",
            });
          };
        </script>
      </body>
    </html> `

export const SwaggerUIRoute = HttpRouter.get(
  "/swagger",
  Effect.gen(function* () {
    return yield* HttpServerResponse.html(SwaggerHtml)
  }),
)

// TODO: maybe we can generate this automatically
export const OpenApiRoute = HttpRouter.get(
  "/openapi.json",
  Effect.gen(function* () {
    const openapi = {
      openapi: "3.0.0",
      info: {
        title,
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          apiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
          },
        },
      },
      paths: {
        "/add-abi": {
          post: {
            summary: "Manully add a contract ABI to the database",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      address: {
                        type: "string",
                      },
                      abi: {
                        type: "string",
                      },
                    },
                    required: ["address", "abi"],
                  },
                },
              },
            },
            security: [
              {
                apiKeyAuth: [],
              },
            ],
          },
        },
        "/supported-chains": {
          get: {
            summary: "List supported chains",
            responses: {
              200: {
                description: "List of supported chains and their ids",
                content: {
                  "application/json": {},
                },
              },
            },
          },
        },
        "/decode/{chain}/{hash}": {
          get: {
            summary: "Decode transaction",
            parameters: [
              {
                in: "path",
                name: "chain",
                required: true,
                schema: {
                  type: "number",
                },
                description: "The chain id",
              },
              {
                in: "path",
                name: "hash",
                required: true,
                schema: {
                  type: "string",
                },
                description: "The transaction hash",
              },
            ],
            responses: {
              200: {
                description: "Decode transaction by chain id and hash",
                content: {
                  "application/json": {},
                },
              },
            },
          },
        },
        "/interpret/{chain}/{hash}": {
          get: {
            summary: "Interpret transaction",
            parameters: [
              {
                in: "path",
                name: "chain",
                required: true,
                schema: {
                  type: "number",
                },
                description: "The chain id",
              },
              {
                in: "path",
                name: "hash",
                required: true,
                schema: {
                  type: "string",
                },
                description: "The transaction hash",
              },
            ],
            responses: {
              200: {
                description: "Interpret transaction by chain id and hash",
                content: {
                  "application/json": {},
                },
              },
            },
          },
        },
      },
    }

    return yield* HttpServerResponse.json(openapi)
  }),
)
