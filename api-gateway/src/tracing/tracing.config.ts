import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Span } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { IncomingMessage, ServerResponse } from 'http';

const serviceName = 'glavito-api-gateway';
const serviceVersion = '1.0.0';

// Resource configuration
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'glavito',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Span processors based on environment
const spanProcessors: BatchSpanProcessor[] = [];

// Jaeger exporter for distributed tracing
if (process.env.JAEGER_ENDPOINT || process.env.NODE_ENV !== 'production') {
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });
  spanProcessors.push(new BatchSpanProcessor(jaegerExporter));
}

// Zipkin exporter as fallback
if (process.env.ZIPKIN_ENDPOINT) {
  const zipkinExporter = new ZipkinExporter({
    url: process.env.ZIPKIN_ENDPOINT,
    serviceName: serviceName,
  });
  spanProcessors.push(new BatchSpanProcessor(zipkinExporter));
}

// Metrics configuration (optional)
const meterProvider = new MeterProvider({
  resource: resource,
});

// Prometheus metrics (enable only when explicitly requested)
const enablePrometheus = (process.env.ENABLE_PROMETHEUS || '').toLowerCase() === 'true';
if (enablePrometheus) {
  try {
    const prometheusExporter = new PrometheusExporter({
      port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
    });
    meterProvider.addMetricReader(prometheusExporter);
  } catch (err) {
    // Do not crash app if metrics port is already in use or exporter fails
    // eslint-disable-next-line no-console
    console.warn('[otel] Prometheus exporter disabled:', (err as Error)?.message || String(err));
  }
}

// Register instrumentations
registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: true },
    }),
    new HttpInstrumentation({
      requestHook: (span, request) => {
        const req = request as IncomingMessage & { body?: any };
        span.setAttributes({
          'http.request.body': JSON.stringify(req.body || {}),
          'http.request.headers': JSON.stringify(req.headers || {}),
        });
      },
      responseHook: (_span, response) => {
        const res = response as ServerResponse & { body?: any };
        res.body; // noop to mark used
      },
    }),
    new NestInstrumentation(),
    new PinoInstrumentation(),
  ],
});

// Initialize OpenTelemetry SDK
export const otelSDK = new NodeSDK({
  resource: resource,
  spanProcessor: spanProcessors[0],
  instrumentations: [
    new HttpInstrumentation(),
    new NestInstrumentation(),
    new PinoInstrumentation(),
  ],
});

// Helper function for custom tracing (kept minimal to avoid unused types)
export const createSpan = (name: string, attributes?: Record<string, any>) => {
  const tracer = (global as any).otelTracer || require('@opentelemetry/api').trace.getTracer(serviceName, serviceVersion);
  const span: Span = tracer.startSpan(name);
  if (attributes) span.setAttributes(attributes as any);
  return span;
};