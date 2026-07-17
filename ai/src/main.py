import argparse

from data import prepare
from evaluate import evaluate
from pretrain import pretrain
from train import train


def main() -> None:
    parser = argparse.ArgumentParser(description="VAI Code offline AI workspace")
    parser.add_argument("command", choices=["prepare", "train", "pretrain", "evaluate"])
    command = parser.parse_args().command
    actions = {"prepare": prepare, "train": train, "pretrain": pretrain, "evaluate": evaluate}
    print(actions[command]())


if __name__ == "__main__":
    main()
