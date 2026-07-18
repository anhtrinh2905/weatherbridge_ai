import argparse

from bias_correction import bias_correct
from data import prepare
from evaluate import evaluate
from pretrain import pretrain
from train import train


def main() -> None:
    parser = argparse.ArgumentParser(description="Weather Bridge AI offline AI workspace")
    parser.add_argument(
        "command",
        choices=["prepare", "train", "pretrain", "evaluate", "bias-correct"],
    )
    command = parser.parse_args().command
    actions = {
        "prepare": prepare,
        "train": train,
        "pretrain": pretrain,
        "evaluate": evaluate,
        "bias-correct": bias_correct,
    }
    print(actions[command]())


if __name__ == "__main__":
    main()
