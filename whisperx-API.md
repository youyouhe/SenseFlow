# WhisperX REST API 文档

## 概述

WhisperX API 提供高精度语音识别服务，支持：
- 多语言转录（支持中文、英文等）
- 词级时间戳对齐
- 说话人分离（Diarization）
- 异步任务处理

**Base URL**: `http://your-server:8000`

---

## 认证

当前版本无需认证。

---

## 端点总览

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/v1/transcribe` | 创建异步转录任务 |
| POST | `/v1/transcribe/sync` | 同步转录（短音频） |
| GET | `/v1/tasks/{task_id}` | 获取任务状态 |
| GET | `/v1/tasks/{task_id}/stream` | SSE 实时进度流 |
| GET | `/v1/tasks/{task_id}/result` | 获取任务结果 |
| GET | `/v1/tasks` | 列出所有任务 |
| DELETE | `/v1/tasks/{task_id}` | 取消/删除任务 |
| GET | `/v1/models` | 列出可用模型 |
| GET | `/health` | 健康检查 |

---

## 1. 创建异步转录任务

创建一个新的转录任务，返回任务ID用于后续查询状态和结果。

### 请求

```http
POST /v1/transcribe
Content-Type: multipart/form-data
```

### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| audio | file | ✅ | - | 音频文件（支持 mp3, wav, m4a, flac 等） |
| model | string | ❌ | small | Whisper模型大小：tiny, base, small, medium, large-v2, large-v3 |
| language | string | ❌ | auto | 语言代码：zh, en, ja, ko 等（不指定则自动检测） |
| task | string | ❌ | transcribe | 任务类型：transcribe, translate |
| device | string | ❌ | cuda | 设备：cpu, cuda |
| compute_type | string | ❌ | float16 | 计算类型：float16, int8, float32 |
| align_output | boolean | ❌ | false | 是否输出词级时间戳 |
| diarize | boolean | ❌ | false | 是否启用说话人分离 |
| min_speakers | integer | ❌ | - | 最少说话人数（配合diarize使用） |
| max_speakers | integer | ❌ | - | 最多说话人数（配合diarize使用） |
| batch_size | integer | ❌ | auto | 批处理大小 |
| vad_filter | boolean | ❌ | true | 是否启用VAD预处理 |
| word_timestamps | boolean | ❌ | false | 是否提取词级时间戳 |
| temperature | float | ❌ | 0.0 | 采样温度 |
| best_of | integer | ❌ | 5 | 候选数量 |
| beam_size | integer | ❌ | 5 | Beam搜索大小 |

### 响应

**成功 (202 Accepted)**

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2026-01-18T10:30:00.123456",
  "message": "Task created successfully"
}
```

### 示例

```bash
# 英文转录 + 对齐
curl -X POST http://localhost:8000/v1/transcribe \
  -F "audio=@audio.mp3" \
  -F "model=small" \
  -F "language=en" \
  -F "align_output=true" \
  -F "compute_type=int8"

# 中文转录 + 说话人分离
curl -X POST http://localhost:8000/v1/transcribe \
  -F "audio=@audio.wav" \
  -F "model=large-v2" \
  -F "language=zh" \
  -F "diarize=true" \
  -F "min_speakers=2" \
  -F "max_speakers=4"

# 完整功能：转录 + 对齐 + 说话人分离
curl -X POST http://localhost:8000/v1/transcribe \
  -F "audio=@meeting.mp3" \
  -F "model=large-v2" \
  -F "language=en" \
  -F "align_output=true" \
  -F "diarize=true" \
  -F "min_speakers=2" \
  -F "max_speakers=5"
```

---

## 2. 同步转录（短音频）

适用于短音频（< 30秒），直接返回结果。

### 请求

```http
POST /v1/transcribe/sync
Content-Type: multipart/form-data
```

参数与 `/v1/transcribe` 相同。

### 响应

**成功 (200 OK)**

```json
{
  "result": {
    "segments": [
      {
        "id": 1,
        "start": 0,
        "end": 2.5,
        "text": "Hello world",
        "speaker": null
      }
    ],
    "language": "en",
    "duration": 2.5
  },
  "file_info": {
    "filename": "audio.mp3",
    "size": 123456,
    "duration": 2.5
  }
}
```

---

## 3. 获取任务状态

查询任务的当前状态和进度。

### 请求

```http
GET /v1/tasks/{task_id}
```

### 响应

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "stage": "aligning",
  "progress": 65.0,
  "message": "Aligning words for timestamps",
  "created_at": "2026-01-18T10:30:00.123456",
  "updated_at": "2026-01-18T10:30:30.123456",
  "started_at": "2026-01-18T10:30:05.123456",
  "completed_at": null
}
```

### 状态说明

| status | 描述 |
|--------|------|
| queued | 任务排队中 |
| processing | 处理中 |
| completed | 完成 |
| failed | 失败 |

### stage 说明

| stage | 描述 |
|-------|------|
| queued | 排队中 |
| transcribing | 语音识别中 |
| aligning | 词对齐中 |
| diarizing | 说话人分离中 |
| formatting | 格式化输出中 |
| completed | 已完成 |
| failed | 已失败 |

---

## 4. SSE 实时进度流

通过 Server-Sent Events 获取实时进度更新。

### 请求

```http
GET /v1/tasks/{task_id}/stream
Accept: text/event-stream
```

### 响应

```
data: {"progress": 10.0, "stage": "transcribing", "message": "Loading audio and running ASR"}

data: {"progress": 40.0, "stage": "transcribing", "message": "Transcribed 15 segments"}

data: {"progress": 50.0, "stage": "aligning", "message": "Aligning words for timestamps"}

data: {"progress": 75.0, "stage": "diarizing", "message": "Identifying speakers"}

data: {"progress": 100.0, "stage": "completed", "message": "Transcription completed"}
```

### JavaScript 示例

```javascript
const eventSource = new EventSource(
  'http://localhost:8000/v1/tasks/{task_id}/stream'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}% - ${data.message}`);

  if (data.stage === 'completed') {
    eventSource.close();
    fetchResult();
  }
};
```

---

## 5. 获取任务结果

获取已完成的转录结果。

### 请求

```http
GET /v1/tasks/{task_id}/result
```

### 基础转录结果

```json
{
  "segments": [
    {
      "id": 1,
      "start": 0,
      "end": 2.5,
      "text": "Here's what you need to know about the key points.",
      "speaker": null
    }
  ],
  "language": "en",
  "language_probability": 0.99,
  "duration": 120.5,
  "model": "small",
  "device": "cuda"
}
```

### 带词对齐的结果

```json
{
  "segments": [
    {
      "id": 1,
      "start": 0,
      "end": 2.02,
      "text": " Here's what you need to know about the key points.",
      "words": [
        {
          "word": "Here's",
          "start": 0,
          "end": 0.408,
          "score": 0.87
        },
        {
          "word": "what",
          "start": 0.429,
          "end": 0.531,
          "score": 0.875
        }
      ]
    }
  ],
  "word_segments": [...],
  "duration": 2.02
}
```

### 带说话人分离的结果

```json
{
  "segments": [
    {
      "id": 1,
      "start": 0,
      "end": 5.2,
      "text": "Hello, how are you?",
      "speaker": "SPEAKER_00"
    },
    {
      "id": 2,
      "start": 5.5,
      "end": 10.1,
      "text": "I'm doing great, thanks!",
      "speaker": "SPEAKER_01"
    }
  ],
  "language": "en",
  "duration": 10.1
}
```

### 完整结果（对齐 + 说话人分离）

```json
{
  "segments": [
    {
      "id": 1,
      "start": 0,
      "end": 2.02,
      "text": " Here's what you need to know about the key points.",
      "speaker": "SPEAKER_00",
      "words": [
        {
          "word": "Here's",
          "start": 0,
          "end": 0.408,
          "score": 0.87,
          "speaker": "SPEAKER_00"
        },
        {
          "word": "what",
          "start": 0.429,
          "end": 0.531,
          "score": 0.875,
          "speaker": "SPEAKER_00"
        }
      ]
    }
  ],
  "duration": 2.02
}
```

---

## 6. 列出所有任务

获取所有任务列表。

### 请求

```http
GET /v1/tasks
```

### 响应

```json
{
  "count": 2,
  "tasks": [
    {
      "task_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "stage": "completed",
      "progress": 100,
      "created_at": "2026-01-18T10:30:00.123456",
      "updated_at": "2026-01-18T10:30:15.123456"
    },
    {
      "task_id": "660e8400-e29b-41d4-a716-446655440001",
      "status": "processing",
      "stage": "aligning",
      "progress": 65,
      "created_at": "2026-01-18T10:31:00.123456",
      "updated_at": "2026-01-18T10:31:30.123456"
    }
  ]
}
```

---

## 7. 取消/删除任务

取消正在处理的任务或删除已完成的任务。

### 请求

```http
DELETE /v1/tasks/{task_id}
```

### 响应

**成功 (200 OK)**

```json
{
  "message": "Task cancelled successfully",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 8. 列出可用模型

获取所有支持的 Whisper 模型、对齐模型和分离模型。

### 请求

```http
GET /v1/models
```

### 响应

```json
{
  "whisper": [
    {
      "name": "tiny",
      "type": "whisper",
      "size": "tiny",
      "loaded": false
    },
    {
      "name": "small",
      "type": "whisper",
      "size": "small",
      "loaded": false
    },
    {
      "name": "large-v2",
      "type": "whisper",
      "size": "large v2",
      "loaded": false
    }
  ],
  "alignment": [
    {
      "name": "wav2vec2-en",
      "type": "alignment",
      "language": "en",
      "loaded": false
    },
    {
      "name": "wav2vec2-zh",
      "type": "alignment",
      "language": "zh",
      "loaded": false
    }
  ],
  "diarization": {
    "name": "pyannote/speaker-diarization-3.1",
    "type": "diarization",
    "loaded": false
  }
}
```

---

## 9. 健康检查

检查API服务状态和GPU可用性。

### 请求

```http
GET /health
```

### 响应

```json
{
  "status": "healthy",
  "version": "3.7.4",
  "gpu_available": true,
  "gpu_device": "NVIDIA GeForce GTX 1080",
  "memory_used": 2048.5,
  "memory_total": 8106.8125,
  "active_tasks": 2
}
```

---

## 错误响应

### 错误格式

```json
{
  "error": "ERROR_CODE",
  "message": "人类可读的错误描述",
  "details": {
    "stage": "asr",
    "task_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 常见错误码

| 错误码 | HTTP状态 | 描述 |
|--------|----------|------|
| VALIDATION_ERROR | 422 | 请求参数验证失败 |
| FILE_TOO_LARGE | 413 | 文件超过大小限制 |
| UNSUPPORTED_FORMAT | 400 | 不支持的音频格式 |
| TASK_NOT_FOUND | 404 | 任务不存在 |
| TRANSCRIPTION_ERROR | 500 | 转录处理失败 |
| MODEL_LOAD_ERROR | 500 | 模型加载失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 支持的语言

| 代码 | 语言 | 对齐支持 |
|------|------|----------|
| zh | 中文 | ✅ (需PyTorch 2.6+) |
| en | 英语 | ✅ |
| ja | 日语 | ✅ |
| ko | 韩语 | ✅ |
| es | 西班牙语 | ✅ |
| fr | 法语 | ✅ |
| de | 德语 | ✅ |
| it | 意大利语 | ✅ |
| pt | 葡萄牙语 | ✅ |
| ru | 俄语 | ✅ |

更多语言请参考 API 文档。

---

## 推荐配置

### 快速转录（实时）
```bash
model=small
compute_type=int8
align_output=false
```

### 高精度（离线）
```bash
model=large-v2
compute_type=float16
align_output=true
```

### 会议记录
```bash
model=large-v2
diarize=true
min_speakers=2
max_speakers=10
align_output=true
```

### 中文字幕
```bash
model=large-v2
language=zh
align_output=true  # 注意：需要PyTorch 2.6+
```

---

## 限制说明

1. **文件大小**: 最大 500MB
2. **并发任务**: 默认最多 3 个同时处理
3. **任务保留**: 已完成任务保留 24 小时
4. **中文对齐**: 需要 PyTorch 2.6+，当前版本暂不支持
5. **模型兼容性**:
   - small 模型: 支持 int8/float16/float32
   - medium 模型: 仅支持 CPU 模式
   - large-v2/v3: 支持 int8 (float16需更强GPU)

---

## 完整示例

### JavaScript/TypeScript

```typescript
async function transcribeAudio(file: File) {
  // 1. 创建任务
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('model', 'small');
  formData.append('language', 'en');
  formData.append('align_output', 'true');
  formData.append('compute_type', 'int8');

  const response = await fetch('http://localhost:8000/v1/transcribe', {
    method: 'POST',
    body: formData
  });

  const { task_id } = await response.json();
  console.log('Task created:', task_id);

  // 2. 监听进度
  const eventSource = new EventSource(
    `http://localhost:8000/v1/tasks/${task_id}/stream`
  );

  return new Promise((resolve, reject) => {
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(`Progress: ${data.progress}%`);

      if (data.stage === 'completed') {
        eventSource.close();
        fetchResult(task_id).then(resolve);
      } else if (data.stage === 'failed') {
        eventSource.close();
        reject(new Error('Transcription failed'));
      }
    };
  });
}

async function fetchResult(taskId: string) {
  const response = await fetch(
    `http://localhost:8000/v1/tasks/${taskId}/result`
  );
  return await response.json();
}

// 使用
const result = await transcribeAudio(audioFile);
console.log(result.segments);
```

### Python

```python
import requests
import time

def transcribe_audio(file_path: str, language: str = "en"):
    url = "http://localhost:8000/v1/transcribe"

    with open(file_path, "rb") as f:
        files = {"audio": f}
        data = {
            "model": "small",
            "language": language,
            "align_output": "true",
            "compute_type": "int8"
        }

        # 创建任务
        response = requests.post(url, files=files, data=data)
        task_id = response.json()["task_id"]
        print(f"Task created: {task_id}")

        # 轮询状态
        while True:
            status = requests.get(f"{url}/../tasks/{task_id}").json()

            if status["status"] == "completed":
                # 获取结果
                result = requests.get(f"{url}/../tasks/{task_id}/result").json()
                return result
            elif status["status"] == "failed":
                raise Exception("Transcription failed")

            print(f"Progress: {status['progress']}% - {status['stage']}")
            time.sleep(2)

# 使用
result = transcribe_audio("audio.mp3", language="en")
for segment in result["segments"]:
    print(f"[{segment['start']:.2f}s - {segment['end']:.2f}s] {segment['text']}")
```

---

## 技术支持

- **文档**: [WhisperX GitHub](https://github.com/m-bain/whisperX)
- **问题反馈**: 请在 GitHub Issues 提交

---

*文档版本: 1.0.0*
*最后更新: 2026-01-18*
