from dataclasses import dataclass
import yaml


@dataclass
class DatasetConfig:
    repo_id: str
    repo_type: str
    dataset_folder: str
    raw_data_path: str
    processed_data_path: str


@dataclass
class SplitConfig:
    train: float
    val: float
    test: float
    random_state: int


@dataclass
class ImageConfig:
    width: int
    height: int
    channels: int


@dataclass
class TrainingConfig:
    batch_size: int
    epochs: int
    learning_rate: float


@dataclass
class ModelConfig:
    input_shape: list[int]
    num_classes: int
    save_path: str


@dataclass
class InferenceConfig:
    threshold: float


@dataclass
class AppConfig:
    dataset: DatasetConfig
    split: SplitConfig
    image: ImageConfig
    training: TrainingConfig
    model: ModelConfig
    inference: InferenceConfig


def load_config(config_path: str = "configs/config.yaml") -> AppConfig:
    """
    Load yaml configuration and return AppConfig dataclass.
    """
    with open(config_path, "r") as file:
        config_dict = yaml.safe_load(file)

    return AppConfig(
        dataset=DatasetConfig(**config_dict["dataset"]),
        split=SplitConfig(**config_dict["split"]),
        image=ImageConfig(**config_dict["image"]),
        training=TrainingConfig(**config_dict["training"]),
        model=ModelConfig(**config_dict["model"]),
        inference=InferenceConfig(**config_dict["inference"]),
    )
