import argparse

from backfill_cli import build_parser


def test_sync_parser_requires_explicit_data_collection() -> None:
    args = build_parser().parse_args(["sync", "--require-training-data"])
    assert args.command == "sync"
    assert args.collect is False
    assert args.require_training_data is True
    assert args.export is False


def test_sync_parser_can_request_collection_and_export() -> None:
    args = build_parser().parse_args(
        [
            "sync",
            "--collect",
            "--export",
            "--start-date",
            "2024-07-01",
            "--end-date",
            "2024-07-31",
            "--products",
            "previous_runs",
        ]
    )
    assert isinstance(args, argparse.Namespace)
    assert args.collect is True
    assert args.export is True
    assert args.products == ["previous_runs"]
