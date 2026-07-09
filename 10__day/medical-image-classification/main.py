from pathlib import Path
import pandas as pd

from src.components.data_preprocessing import DataPreprocessing
from src.components.model_trainer import ModelTrainer
from src.components.model_evaluation import ModelEvaluator


def main():
    # 1. Preprocess and load data loaders
    preprocessing = DataPreprocessing()
    train_ds, val_ds, test_ds = preprocessing.load_datasets()

    # 2. Train model
    trainer = ModelTrainer()
    model, history = trainer.train(train_ds, val_ds)

    # 3. Save training history metrics
    Path("artifacts").mkdir(parents=True, exist_ok=True)
    history_df = pd.DataFrame(history.history)
    history_df.to_csv("artifacts/history.csv", index=False)
    print("Training history saved to artifacts/history.csv")

    # 4. Evaluate model on test set
    evaluator = ModelEvaluator()
    evaluator.evaluate(model, test_ds)


if __name__ == "__main__":
    main()
