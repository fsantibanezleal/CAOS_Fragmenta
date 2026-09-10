"""The named pipeline stages: frozen names, reworked bodies.

Order: ingest, preprocess, dataset, feature_extraction, train, infer, evaluate, export, validate.
Each stage is deterministic, typed, seeded and independently testable, and none of them is a no-op.
"""
