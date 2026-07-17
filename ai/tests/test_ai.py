from data import split
from evaluate import evaluate
from pretrain import pretrain
from train import train


def test_offline_ai_scaffold() -> None:
    assert split(["a", "b", "c", "d"], 0.5) == (["a", "b"], ["c", "d"])
    assert train()["status"] == "scaffold_only"
    assert pretrain()["status"].startswith("requires_")
    assert evaluate([0.25, 0.75])["mean"] == 0.5
