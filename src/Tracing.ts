import { NodeSdk } from "@effect/opentelemetry"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"

export const TracingLive = NodeSdk.layer(() => ({
  resource: { serviceName: "@3loop/decoder-api" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({}),
    exportIntervalMillis: 5000,
  }),
}))
