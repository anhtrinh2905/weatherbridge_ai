import argparse

from bias_correction import bias_correct
from data import prepare
from evaluate import evaluate
from pretrain import pretrain
from rainfall_trigger import run_pipeline
from risk import run_risk_pipeline
from train import train


def main() -> None:
    parser = argparse.ArgumentParser(description="Weather Bridge AI offline AI workspace")
    parser.add_argument(
        "command",
        choices=[
            "prepare", "train", "pretrain", "evaluate",
            "bias-correct", "rainfall-trigger", "risk",
        ],
    )
    command = parser.parse_args().command
    actions = {
        "prepare": prepare,
        "train": train,
        "pretrain": pretrain,
        "evaluate": evaluate,
        "bias-correct": bias_correct,
        "rainfall-trigger": run_pipeline,
        "risk": run_risk_pipeline,
    }
    print(actions[command]())


if __name__ == "__main__":
    main()
