"""Milvus storage — ONE collection for the whole corpus.

Milvus Lite (embedded, file-backed) by default. Set MILVUS_URI to a server
endpoint (e.g. http://host:19530) and the same code talks to a full Milvus
deployment — no other changes. Note MILVUS_URI is also pymilvus's own env
var for the server address, so the local Lite file path uses ADTU_MILVUS_DB
instead (never point MILVUS_URI at a file path — pymilvus rejects it).
"""

import logging
import os

from pymilvus import DataType, MilvusClient

import config

log = logging.getLogger(__name__)

QUERY_BATCH = 16384  # Milvus per-query row cap


def get_client() -> MilvusClient:
    uri = (os.environ.get("MILVUS_URI")
           or os.environ.get("ADTU_MILVUS_DB")
           or config.DEFAULT_DB_URI)
    return MilvusClient(uri=uri)


def ensure_collection(client: MilvusClient) -> None:
    if client.has_collection(config.COLLECTION_NAME):
        return
    schema = client.create_schema(auto_id=False, enable_dynamic_field=False)
    schema.add_field(field_name="chunk_id", datatype=DataType.INT64, is_primary=True)
    schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=65535)
    schema.add_field(field_name="source", datatype=DataType.VARCHAR, max_length=512)
    schema.add_field(field_name="category", datatype=DataType.VARCHAR, max_length=128)
    schema.add_field(field_name="page", datatype=DataType.INT64)
    schema.add_field(field_name="file_sha", datatype=DataType.VARCHAR, max_length=64)
    schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=config.EMBED_DIM)
    index_params = client.prepare_index_params()
    index_params.add_index(field_name="vector", index_type="FLAT", metric_type="COSINE")
    client.create_collection(
        collection_name=config.COLLECTION_NAME,
        schema=schema,
        index_params=index_params,
    )
    log.info("created collection %s (FLAT/COSINE, dim=%d)",
             config.COLLECTION_NAME, config.EMBED_DIM)


def drop_collection(client: MilvusClient) -> None:
    if client.has_collection(config.COLLECTION_NAME):
        client.drop_collection(config.COLLECTION_NAME)


def insert_records(client: MilvusClient, records: list) -> int:
    """Insert records [{chunk_id, text, source, category, page, file_sha,
    vector}] in batches; returns inserted count."""
    total = 0
    for i in range(0, len(records), config.INSERT_BATCH_SIZE):
        batch = records[i:i + config.INSERT_BATCH_SIZE]
        res = client.insert(collection_name=config.COLLECTION_NAME, data=batch)
        total += int(res.get("insert_count", len(batch)))
    return total


def has_file(client: MilvusClient, file_sha: str) -> bool:
    res = client.query(
        collection_name=config.COLLECTION_NAME,
        filter=f'file_sha == "{file_sha}"',
        output_fields=["chunk_id"],
        limit=1,
    )
    return bool(res)


def max_chunk_id(client: MilvusClient) -> int:
    """Highest chunk_id in the collection (0 when empty). Paginated because
    Milvus caps queries at 16384 rows."""
    ids = []
    offset = 0
    while True:
        res = client.query(
            collection_name=config.COLLECTION_NAME,
            filter="chunk_id >= 0",
            output_fields=["chunk_id"],
            limit=QUERY_BATCH,
            offset=offset,
        )
        if not res:
            break
        ids.extend(int(r["chunk_id"]) for r in res)
        if len(res) < QUERY_BATCH:
            break
        offset += len(res)
    return max(ids) if ids else 0


def _count_filter(client: MilvusClient, filt: str) -> int:
    n = 0
    offset = 0
    while True:
        res = client.query(
            collection_name=config.COLLECTION_NAME,
            filter=filt,
            output_fields=["chunk_id"],
            limit=QUERY_BATCH,
            offset=offset,
        )
        n += len(res)
        if len(res) < QUERY_BATCH:
            break
        offset += len(res)
    return n


def count_rows(client: MilvusClient) -> int:
    stats = client.get_collection_stats(config.COLLECTION_NAME)
    return int(stats.get("row_count", 0))


def stats(client: MilvusClient) -> dict:
    return {
        "row_count": count_rows(client),
        "per_category": {
            c: _count_filter(client, f'category == "{c}"')
            for c in config.CATEGORIES
        },
    }
