import torch
from torch import nn


class BasicBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.residual = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3,
                      stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(),
            nn.Conv2d(out_channels, out_channels, 3,
                      padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
        )
        # 덧셈 전에 채널 수와 공간 크기를 일치시킨다.
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, 1,
                          stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.shortcut = nn.Identity()
        self.relu = nn.ReLU()

    def forward(self, x):
        residual = self.residual(x)
        shortcut = self.shortcut(x)
        assert residual.shape == shortcut.shape
        return self.relu(residual + shortcut)


class ResNet18(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(3, 64, 7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(3, stride=2, padding=1),
        )
        self.layer1 = self.make_stage(64, 64, stride=1)
        self.layer2 = self.make_stage(64, 128, stride=2)
        self.layer3 = self.make_stage(128, 256, stride=2)
        self.layer4 = self.make_stage(256, 512, stride=2)
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(512, num_classes)

        for module in self.modules():
            if isinstance(module, nn.Conv2d):
                nn.init.kaiming_normal_(module.weight, mode="fan_out",
                                        nonlinearity="relu")
            elif isinstance(module, nn.BatchNorm2d):
                nn.init.ones_(module.weight)
                nn.init.zeros_(module.bias)

    @staticmethod
    def make_stage(in_channels, out_channels, stride):
        return nn.Sequential(
            BasicBlock(in_channels, out_channels, stride),
            BasicBlock(out_channels, out_channels),
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = torch.flatten(x, start_dim=1)  # N × 512: 배치 차원은 유지한다.
        return self.fc(x)  # Softmax 전 점수(logits)를 반환한다.


torch.manual_seed(0)
model = ResNet18(num_classes=10)
print("torch version:", torch.__version__)
assert sum(p.numel() for p in model.parameters()) == 11_181_642
# forward hook으로 실제 중간 형태를 출력한다. 첫 forward 뒤 제거한다.
handles = []
for name in ("stem", "layer1", "layer2", "layer3", "layer4", "avgpool", "fc"):
    def show_shape(module, inputs, output, stage=name):
        print(stage, tuple(output.shape))
    handles.append(getattr(model, name).register_forward_hook(show_shape))
images = torch.randn(2, 3, 224, 224)  # NCHW: RGB 이미지 2장
labels = torch.tensor([1, 3], dtype=torch.long)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.01, momentum=0.9)

# 학습: 예측 → 손실 → 기울기 → 가중치 수정
model.train()
optimizer.zero_grad()
logits = model(images)
for handle in handles:
    handle.remove()
assert logits.shape == (2, 10)
before = model.fc.weight.detach().clone()
loss = criterion(logits, labels)  # Softmax를 먼저 적용하지 않는다.
assert torch.isfinite(loss)
loss.backward()
assert model.fc.weight.grad is not None
assert torch.isfinite(model.fc.weight.grad).all()
optimizer.step()
assert not torch.equal(before, model.fc.weight.detach())
print("logits shape:", logits.shape)  # torch.Size([2, 10])
print("loss:", loss.item())

# 추론: BatchNorm을 평가 모드로 전환한다.
model.eval()
with torch.no_grad():
    logits = model(images)
    probabilities = torch.softmax(logits, dim=1)
    predictions = logits.argmax(dim=1)
assert torch.allclose(probabilities.sum(dim=1), torch.ones(2), atol=1e-5)
print("probability sums:", probabilities.sum(dim=1))  # 약 [1, 1]
print("predictions:", predictions)
