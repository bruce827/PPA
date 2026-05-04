# MiniMax TTS 语音生成提示词模板

## 适用场景
课程文案、知识类播客、项目评估讲解等口语化内容

## 推荐配置

```bash
mmx speech synthesize \
  --text "你的逐字稿内容" \
  --model speech-2.8-hd \
  --voice "male-qn-qingse" \
  --speed 1.0 \
  --pitch 0 \
  --emotion calm \
  --language-boost Chinese \
  --format mp3 \
  --sample-rate 32000 \
  --bitrate 128000 \
  --out "输出路径.mp3"
```

## 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| `model` | `speech-2.8-hd` | 最高质量 |
| `voice` | `male-qn-qingse` | 男声、清晰、适合知识类内容 |
| `speed` | `1.0` | 正常语速 |
| `pitch` | `0` | 原调，不调整 |
| `emotion` | `calm` | 冷静专业，像在讲课 |
| `language-boost` | `Chinese` | 中文增强 |

## 备选音色

| voice_id | 特点 |
|----------|------|
| `male-qn-qingse` | 男声、清晰中立（默认） |
| `male-tianmei` | 更低沉有力 |
| `female-tianmei` | 女声可选 |

## 可选情感

`happy` | `sad` | `angry` | `fearful` | `disgusted` | `surprised` | `calm` | `fluent` | `whisper`

## 注意事项

- 文本超 3000 字符建议分段生成
- 超出配额会报 `usage limit exceeded`，等待刷新后重试
- 可用 `--quiet` 减少输出

---

*创建于 2026-05-04，用于 PPA 项目课程文案语音生成*