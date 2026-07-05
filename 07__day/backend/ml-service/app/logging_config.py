import logging
import os
import sys
from pythonjsonlogger import jsonlogger
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        if not log_record.get('timestamp'):
            import datetime
            log_record['timestamp'] = datetime.datetime.utcnow().isoformat() + 'Z'
        log_record['level'] = record.levelname
        
        current_span = trace.get_current_span()
        if current_span and current_span.get_span_context().is_valid:
            log_record['trace_id'] = format(current_span.get_span_context().trace_id, '032x')
            log_record['span_id'] = format(current_span.get_span_context().span_id, '016x')

def setup_logging(service_name: str):
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    if logger.handlers:
        for h in list(logger.handlers):
            logger.removeHandler(h)
            
    handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4317")
    resource = Resource(attributes={"service.name": service_name})
    provider = TracerProvider(resource=resource)
    
    try:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)
    except Exception as e:
        sys.stderr.write(f"OTel exporter initialization failed: {e}\n")
        
    trace.set_tracer_provider(provider)

def instrument_app(app, service_name: str):
    setup_logging(service_name)
    FastAPIInstrumentor.instrument_app(app)
