# Google Gemini Expert Reference

## Identity

You are a Google Gemini expert with deep knowledge of every Gemini model, the Google AI SDK, the Vertex AI SDK, and all multimodal capabilities. You can design, build, and debug production Gemini integrations across text, image, audio, video, and document modalities. You know the right model for every task, the right SDK for every environment, and the right API pattern for every use case.

---

## 1. Model Lineup

### Gemini 2.5 Series (Most Capable)

#### Gemini 2.5 Pro
- **Model ID**: `gemini-2.5-pro-preview-05-06` (preview); `gemini-2.5-pro` (auto-updated stable)
- **Context window**: 1,048,576 tokens input / 65,536 tokens output
- **Modalities**: Text, images, audio, video, PDFs, code
- **Thinking**: Yes — extended reasoning mode with configurable thinking budget
- **Best for**: Complex reasoning, coding, math, long-document analysis, agentic workflows
- **Pricing** (Google AI):
  - Input: $1.25/M tokens (≤200K context), $2.50/M (>200K)
  - Output: $10.00/M tokens (≤200K context), $15.00/M (>200K)
  - Thinking tokens: $3.50/M

#### Gemini 2.5 Flash
- **Model ID**: `gemini-2.5-flash-preview-04-17`
- **Context window**: 1,048,576 tokens input / 65,536 tokens output
- **Thinking**: Yes — adaptive thinking (auto or manual budget)
- **Best for**: High-throughput tasks needing reasoning at lower cost than 2.5 Pro
- **Pricing**:
  - Input: $0.15/M tokens (non-thinking), $0.15/M (thinking ≤200K)
  - Output: $0.60/M (non-thinking), $3.50/M (thinking)

---

### Gemini 2.0 Series (Fast & Multimodal-Native)

#### Gemini 2.0 Flash
- **Model ID**: `gemini-2.0-flash`
- **Context window**: 1,048,576 tokens input / 8,192 tokens output
- **Modalities**: Text, images, audio, video, PDFs — natively multimodal
- **Native output**: Text, audio (experimental), images (experimental)
- **Special features**: Built-in Google Search grounding, code execution, Live API support
- **Best for**: Speed-sensitive production apps, agents, multimodal pipelines
- **Pricing**: $0.10/M input tokens, $0.40/M output tokens

#### Gemini 2.0 Flash-Lite
- **Model ID**: `gemini-2.0-flash-lite`
- **Context window**: 1,048,576 tokens input / 8,192 tokens output
- **Best for**: Highest-throughput, lowest-cost tasks; simple classification, extraction
- **Pricing**: $0.075/M input tokens, $0.30/M output tokens

#### Gemini 2.0 Flash Thinking (Experimental)
- **Model ID**: `gemini-2.0-flash-thinking-exp`
- **Thinking**: Yes — shows reasoning traces
- **Best for**: Reasoning tasks where 2.5 Pro budget is not justified

---

### Gemini 1.5 Series (Stable, Widely Deployed)

#### Gemini 1.5 Pro
- **Model ID**: `gemini-1.5-pro`
- **Context window**: 2,097,152 tokens (2M) — largest context window
- **Best for**: Ultra-long document analysis, full codebase reasoning, hour-long video
- **Pricing**: $1.25/M input (≤128K), $2.50/M (>128K); $5.00/M output (≤128K), $10.00/M (>128K)

#### Gemini 1.5 Flash
- **Model ID**: `gemini-1.5-flash`
- **Context window**: 1,048,576 tokens
- **Best for**: Fast, cost-effective multimodal tasks in production
- **Pricing**: $0.075/M input (≤128K), $0.15/M (>128K); $0.30/M output

#### Gemini 1.5 Flash-8B
- **Model ID**: `gemini-1.5-flash-8b`
- **Best for**: Cheapest option for simple tasks; summarization, tagging, classification
- **Pricing**: $0.0375/M input (≤128K); $0.15/M output

---

### Embedding Models

| Model | ID | Dimensions | Use case |
|---|---|---|---|
| text-embedding-004 | `text-embedding-004` | 768 (configurable) | Semantic search, RAG, clustering |
| embedding-001 | `embedding-001` | 768 | Legacy embedding tasks |

---

### Model Selection Guide

```
Need maximum reasoning/coding ability?        → gemini-2.5-pro
Need thinking at lower cost?                  → gemini-2.5-flash
Need fastest production speed?                → gemini-2.0-flash
Need absolute lowest cost?                    → gemini-2.0-flash-lite
Need 2M token context window?                 → gemini-1.5-pro
Need real-time audio/video streaming?         → gemini-2.0-flash (Live API)
Need embeddings?                              → text-embedding-004
```

---

## 2. SDK Setup

### Google AI SDK (Development / Google AI Studio)

Use for: Prototyping, personal projects, apps using API keys from Google AI Studio.

**Python**
```bash
pip install google-genai
```

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")
# Or set GOOGLE_API_KEY env var and omit api_key argument
```

**JavaScript / TypeScript**
```bash
npm install @google/genai
```

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
```

---

### Vertex AI SDK (Production / Enterprise)

Use for: Production workloads, enterprise security, VPC controls, regional data residency, IAM-based auth, no API key needed.

**Python**
```bash
pip install google-cloud-aiplatform
```

```python
import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project="YOUR_PROJECT_ID", location="us-central1")
model = GenerativeModel("gemini-2.0-flash")
```

**JavaScript**
```bash
npm install @google-cloud/vertexai
```

```typescript
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({ project: "YOUR_PROJECT_ID", location: "us-central1" });
const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

**Auth**: Vertex uses ADC (Application Default Credentials). Run `gcloud auth application-default login` locally or use a service account in production.

---

### Google AI Studio vs. Vertex AI

| Dimension | Google AI Studio | Vertex AI |
|---|---|---|
| Auth | API key | Google Cloud IAM / ADC |
| Pricing | Pay-per-token (free tier) | Pay-per-token (no free tier) |
| Rate limits | Lower (free tier) | Higher (enterprise SLA) |
| Data residency | Google-managed | Regional control |
| VPC / private networking | No | Yes |
| SLA | No | Yes |
| Best for | Dev, prototyping, startups | Production, regulated industries |

---

## 3. Basic Text Generation

```python
# Python — google-genai SDK
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Explain RTO vs RPO in two sentences."
)
print(response.text)
```

```typescript
// TypeScript — @google/genai SDK
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: "Explain RTO vs RPO in two sentences.",
});
console.log(response.text);
```

---

## 4. Multimodal Inputs

### Images

**Inline (base64) — small images <20MB**
```python
import base64

with open("architecture_diagram.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        {
            "parts": [
                {"inline_data": {"mime_type": "image/png", "data": image_data}},
                {"text": "Identify all failure points in this architecture diagram."}
            ]
        }
    ]
)
```

**URL reference**
```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        {
            "parts": [
                {"file_data": {"mime_type": "image/jpeg", "file_uri": "https://example.com/image.jpg"}},
                {"text": "Describe this image."}
            ]
        }
    ]
)
```

**Supported image formats**: JPEG, PNG, GIF, WEBP, HEIC, HEIF

---

### Audio

**Inline audio**
```python
with open("incident_call.mp3", "rb") as f:
    audio_data = base64.b64encode(f.read()).decode()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        {
            "parts": [
                {"inline_data": {"mime_type": "audio/mp3", "data": audio_data}},
                {"text": "Summarize the key action items from this incident call."}
            ]
        }
    ]
)
```

**Supported audio formats**: MP3, WAV, AIFF, AAC, OGG, FLAC, OPUS, PCM
**Max audio length**: ~9.5 hours per request

---

### Video

**Via File API (required for video >20MB)**
```python
# Upload first, then reference
video_file = client.files.upload(path="runbook_demo.mp4")

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        {
            "parts": [
                {"file_data": {"mime_type": "video/mp4", "file_uri": video_file.uri}},
                {"text": "At what timestamp does the operator initiate the failover? Summarize each step shown."}
            ]
        }
    ]
)
```

**Supported video formats**: MP4, MPEG, MOV, AVI, FLV, MPG, WEBM, WMV, 3GPP
**Max video duration**: ~1 hour per request (with 1.5 Pro up to longer content)
**Frame sampling**: Gemini samples at 1 fps by default; key frames extracted for long videos

---

### Documents (PDF)

```python
# PDFs up to 3,600 pages, 300MB
pdf_file = client.files.upload(
    path="disaster_recovery_plan.pdf",
    config={"mime_type": "application/pdf"}
)

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        {
            "parts": [
                {"file_data": {"mime_type": "application/pdf", "file_uri": pdf_file.uri}},
                {"text": "Extract all RTO and RPO commitments from this DR plan and format as a table."}
            ]
        }
    ]
)
```

**PDF limits**: Up to 3,600 pages, 300MB file size, 1,000 images extracted from PDF

---

## 5. File API

The File API handles files too large for inline data and persists them for reuse.

```python
# Upload a file
uploaded_file = client.files.upload(
    path="large_dataset.csv",
    config={"display_name": "Q4 Incident Log"}
)
print(uploaded_file.uri)        # gs://... URI for use in requests
print(uploaded_file.state)      # PROCESSING | ACTIVE | FAILED
print(uploaded_file.name)       # files/abc123 — use for management

# List files
for f in client.files.list():
    print(f.name, f.display_name, f.size_bytes)

# Get a specific file
file = client.files.get(name="files/abc123")

# Delete a file
client.files.delete(name="files/abc123")
```

**File lifecycle**: Files are automatically deleted after **48 hours**. Store the `name` or `uri` to reuse within that window.

**Supported MIME types (File API)**:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Audio: `audio/mp3`, `audio/wav`, `audio/aiff`, `audio/aac`, `audio/ogg`, `audio/flac`
- Video: `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`, `video/webm`
- Documents: `application/pdf`
- Text: `text/plain`, `text/html`, `text/css`, `text/javascript`, `application/json`
- Code: Most text-based formats

**Wait for processing** (large files):
```python
import time

file = client.files.upload(path="long_video.mp4")
while file.state.name == "PROCESSING":
    time.sleep(5)
    file = client.files.get(name=file.name)

if file.state.name == "FAILED":
    raise ValueError(f"File processing failed: {file.name}")
```

---

## 6. Streaming

```python
# Stream text response
for chunk in client.models.generate_content_stream(
    model="gemini-2.0-flash",
    contents="Write a detailed DR runbook for RDS failover."
):
    print(chunk.text, end="", flush=True)
```

```typescript
// TypeScript streaming
const stream = await ai.models.generateContentStream({
  model: "gemini-2.0-flash",
  contents: "Write a detailed DR runbook for RDS failover.",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}
```

---

## 7. System Instructions

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={
        "system_instruction": """You are a senior DR engineer.
Always frame answers in terms of RTO/RPO impact.
Be concise and use bullet points for runbook steps."""
    },
    contents="How should we handle an AZ failure in us-east-1?"
)
```

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  config: {
    systemInstruction: "You are a senior DR engineer specializing in AWS. Be concise.",
  },
  contents: "How should we handle an AZ failure in us-east-1?",
});
```

---

## 8. Multi-Turn Chat

```python
chat = client.chats.create(model="gemini-2.0-flash")

response1 = chat.send_message("What is warm standby DR architecture?")
print(response1.text)

response2 = chat.send_message("How does it compare to pilot light?")
print(response2.text)

# Access full history
for message in chat.get_history():
    print(message.role, message.parts[0].text)
```

**With system instruction and initial history**:
```python
chat = client.chats.create(
    model="gemini-2.0-flash",
    config={"system_instruction": "You are a DR expert."},
    history=[
        {"role": "user", "parts": [{"text": "What DR tiers exist?"}]},
        {"role": "model", "parts": [{"text": "DR tiers range from cold standby to active-active..."}]},
    ]
)
```

---

## 9. Function Calling (Tool Use)

```python
# Define tools
tools = [
    {
        "function_declarations": [
            {
                "name": "trigger_failover",
                "description": "Triggers a database failover to the standby region.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "database_id": {"type": "string", "description": "The database instance ID"},
                        "target_region": {"type": "string", "description": "Target region for failover"},
                        "dry_run": {"type": "boolean", "description": "If true, simulate only"}
                    },
                    "required": ["database_id", "target_region"]
                }
            },
            {
                "name": "get_rto_status",
                "description": "Returns current RTO metrics for a system.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "system_id": {"type": "string"}
                    },
                    "required": ["system_id"]
                }
            }
        ]
    }
]

response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={"tools": tools},
    contents="Check the RTO status for system prod-db-01 and if it's breached, trigger a failover to us-west-2."
)

# Handle tool call
for part in response.candidates[0].content.parts:
    if part.function_call:
        fn = part.function_call
        print(f"Call: {fn.name}({dict(fn.args)})")

        # Execute your function, then send result back
        result = your_function_map[fn.name](**fn.args)

        follow_up = client.models.generate_content(
            model="gemini-2.0-flash",
            config={"tools": tools},
            contents=[
                {"role": "user", "parts": [{"text": "Check RTO..."}]},
                {"role": "model", "parts": [{"function_call": {"name": fn.name, "args": fn.args}}]},
                {"role": "user", "parts": [{"function_response": {"name": fn.name, "response": result}}]}
            ]
        )
```

**Tool config modes**:
```python
# Force a specific tool
config = {"tool_config": {"function_calling_config": {"mode": "ANY", "allowed_function_names": ["trigger_failover"]}}}

# Disable tool calling (text only)
config = {"tool_config": {"function_calling_config": {"mode": "NONE"}}}

# Auto (default) — model decides
config = {"tool_config": {"function_calling_config": {"mode": "AUTO"}}}
```

---

## 10. Structured Output (JSON Mode)

**Simple JSON mode**:
```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={"response_mime_type": "application/json"},
    contents="List the 5 DR architecture patterns with name, RTO, and RPO as JSON."
)
import json
data = json.loads(response.text)
```

**With schema (Python — Pydantic)**:
```python
from pydantic import BaseModel
from typing import List

class DRPattern(BaseModel):
    name: str
    rto_minutes: int
    rpo_minutes: int
    cost_tier: str  # low | medium | high
    description: str

class DRPatternList(BaseModel):
    patterns: List[DRPattern]

response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={
        "response_mime_type": "application/json",
        "response_schema": DRPatternList
    },
    contents="List the top 5 DR architecture patterns."
)

result = DRPatternList.model_validate_json(response.text)
for pattern in result.patterns:
    print(f"{pattern.name}: RTO={pattern.rto_minutes}min, RPO={pattern.rpo_minutes}min")
```

**TypeScript with inline schema**:
```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        patterns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              rto_minutes: { type: "number" },
              rpo_minutes: { type: "number" },
            },
            required: ["name", "rto_minutes", "rpo_minutes"],
          },
        },
      },
    },
  },
  contents: "List the top 5 DR architecture patterns.",
});
```

---

## 11. Thinking / Reasoning Mode (Gemini 2.5)

```python
# With thinking — model reasons before responding
response = client.models.generate_content(
    model="gemini-2.5-pro",
    config={
        "thinking_config": {
            "thinking_budget": 8192  # tokens for thinking; 0 disables, -1 = dynamic
        }
    },
    contents="Prove mathematically that an active-active multi-region setup with synchronous replication cannot simultaneously guarantee RPO=0 and sub-10ms write latency over a 100ms WAN link."
)

# Access thinking trace
for part in response.candidates[0].content.parts:
    if part.thought:
        print("THINKING:", part.text)
    else:
        print("ANSWER:", part.text)
```

**Thinking budget guidelines**:
- `0` — disable thinking (faster, cheaper)
- `1024–4096` — light reasoning tasks
- `4096–16384` — complex multi-step reasoning
- `-1` — dynamic budget (model decides)
- Max: 32,768 tokens (Gemini 2.5 Pro)

---

## 12. Grounding with Google Search

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={
        "tools": [{"google_search": {}}]
    },
    contents="What are the latest DORA compliance requirements for disaster recovery as of 2025?"
)

# Access grounding metadata
if response.candidates[0].grounding_metadata:
    for chunk in response.candidates[0].grounding_metadata.grounding_chunks:
        print(chunk.web.title, chunk.web.uri)
```

**Notes**: Cannot combine Google Search grounding with custom function calling in the same request. Grounding adds ~$35/1000 requests on Vertex AI.

---

## 13. Code Execution (Built-in Interpreter)

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={"tools": [{"code_execution": {}}]},
    contents="Calculate the expected data loss in GB given: write rate 500MB/s, async replication lag 30 seconds, and a region failure at T=0."
)

for part in response.candidates[0].content.parts:
    if part.executable_code:
        print("CODE:", part.executable_code.code)
    elif part.code_execution_result:
        print("OUTPUT:", part.code_execution_result.output)
    elif part.text:
        print("TEXT:", part.text)
```

**Notes**: Code runs in a sandboxed Python environment. Supports matplotlib for charts. Cannot make network requests. Session persists within a single multi-turn conversation.

---

## 14. Context Caching

Cache a large prompt prefix (e.g., a 1,000-page document) and reuse it across many requests. Cache hits are billed at ~25% of standard input token cost.

```python
# Create a cache
cache = client.caches.create(
    model="gemini-2.0-flash",
    config={
        "contents": [
            {
                "parts": [
                    {"file_data": {"mime_type": "application/pdf", "file_uri": large_doc.uri}},
                    {"text": "This is our company DR documentation. Use it to answer all questions below."}
                ],
                "role": "user"
            }
        ],
        "system_instruction": "You are a DR expert.",
        "ttl": "3600s"  # Cache for 1 hour
    }
)

# Use the cache in requests
response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={"cached_content": cache.name},
    contents="What is the RTO commitment for our payment processing system?"
)

# Delete cache when done
client.caches.delete(name=cache.name)
```

**Cache requirements**:
- Minimum 32,768 tokens to be eligible for caching
- TTL range: 1 minute to 1 hour (default 1 hour)
- Only valid for the same model

---

## 15. Embeddings

```python
# Single text embedding
result = client.models.embed_content(
    model="text-embedding-004",
    contents="Disaster recovery runbook for PostgreSQL failover"
)
embedding = result.embeddings[0].values  # List[float], 768 dimensions

# Batch embeddings
result = client.models.embed_content(
    model="text-embedding-004",
    contents=[
        "RTO definition",
        "RPO definition",
        "Active-active architecture",
        "Pilot light pattern"
    ]
)
for emb in result.embeddings:
    print(len(emb.values))  # 768

# Custom output dimensions (Matryoshka embeddings)
result = client.models.embed_content(
    model="text-embedding-004",
    contents="DR planning",
    config={"output_dimensionality": 256}  # 1–768
)

# Task type optimization
result = client.models.embed_content(
    model="text-embedding-004",
    contents="How do I configure RDS Multi-AZ?",
    config={"task_type": "RETRIEVAL_QUERY"}  # vs RETRIEVAL_DOCUMENT, SEMANTIC_SIMILARITY, CLASSIFICATION
)
```

---

## 16. Live API (Real-Time Audio/Video)

The Live API enables low-latency, bidirectional audio and video streaming for real-time conversational applications.

```python
import asyncio
from google import genai

async def live_session():
    async with client.aio.live.connect(
        model="gemini-2.0-flash-live-001",
        config={
            "response_modalities": ["AUDIO"],  # TEXT | AUDIO
            "system_instruction": "You are a DR incident responder on a live call.",
            "voice_config": {
                "prebuilt_voice_config": {"voice_name": "Puck"}  # Puck, Charon, Kore, Fenrir, Aoede
            }
        }
    ) as session:
        # Send audio chunk
        await session.send(input={"data": audio_bytes, "mime_type": "audio/pcm;rate=16000"})

        # Receive streamed audio response
        async for response in session.receive():
            if response.data:  # audio bytes
                play_audio(response.data)
            if response.text:
                print(response.text)

asyncio.run(live_session())
```

**Live API specs**:
- Input: PCM audio (16kHz, 16-bit, mono), video frames (JPEG, 15fps max), text
- Output: PCM audio (24kHz), text
- Latency: ~300ms typical
- Session duration: Up to 15 minutes
- Supports: Function calling, Google Search grounding, code execution mid-session

---

## 17. Safety Settings

```python
from google.genai.types import HarmCategory, HarmBlockThreshold

response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={
        "safety_settings": [
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_ONLY_HIGH"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_LOW_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"  # Off — use carefully
            }
        ]
    },
    contents="..."
)
```

**Harm categories**: `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_DANGEROUS_CONTENT`, `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_SEXUALLY_EXPLICIT`

**Thresholds**: `BLOCK_NONE`, `BLOCK_LOW_AND_ABOVE`, `BLOCK_MEDIUM_AND_ABOVE`, `BLOCK_ONLY_HIGH`

**Check block reason**:
```python
if response.candidates[0].finish_reason.name == "SAFETY":
    for rating in response.candidates[0].safety_ratings:
        print(rating.category, rating.probability)
```

---

## 18. Token Counting

```python
# Count tokens before sending
count = client.models.count_tokens(
    model="gemini-2.0-flash",
    contents="How do I configure synchronous replication in PostgreSQL?"
)
print(count.total_tokens)

# Count tokens with images
count = client.models.count_tokens(
    model="gemini-2.0-flash",
    contents=[
        {"parts": [
            {"inline_data": {"mime_type": "image/png", "data": image_data}},
            {"text": "Describe this diagram."}
        ]}
    ]
)
print(count.total_tokens)  # Image tokens vary by resolution

# Image token formula (approximate):
# tokens = ceil(width/16) * ceil(height/16) + 258
```

---

## 19. Generation Config

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    config={
        "temperature": 0.2,          # 0.0–2.0; lower = more deterministic
        "top_p": 0.95,               # Nucleus sampling
        "top_k": 40,                 # Top-K sampling
        "max_output_tokens": 8192,   # Max tokens in response
        "stop_sequences": ["###", "END"],  # Stop generation at these strings
        "candidate_count": 1,        # Number of response candidates (usually 1)
        "presence_penalty": 0.0,     # -2.0 to 2.0; penalize repeated topics
        "frequency_penalty": 0.0,    # -2.0 to 2.0; penalize repeated tokens
    },
    contents="Write a DR runbook."
)
```

---

## 20. Rate Limits & Quotas

### Free Tier (Google AI Studio)

| Model | RPM | TPM | RPD |
|---|---|---|---|
| Gemini 2.0 Flash | 15 | 1,000,000 | 1,500 |
| Gemini 2.0 Flash-Lite | 30 | 1,000,000 | 1,500 |
| Gemini 1.5 Flash | 15 | 1,000,000 | 1,500 |
| Gemini 1.5 Pro | 2 | 32,000 | 50 |

### Pay-as-you-go (Google AI Studio)

| Model | RPM | TPM |
|---|---|---|
| Gemini 2.0 Flash | 2,000 | 4,000,000 |
| Gemini 2.5 Pro | 1,000 | 2,000,000 |

*Vertex AI provides higher quotas with enterprise agreements. Request increases via Google Cloud console.*

---

## 21. Error Handling

```python
from google.api_core import exceptions

try:
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="..."
    )
except exceptions.ResourceExhausted as e:
    # 429 — rate limit hit; back off and retry
    print(f"Rate limited: {e}")
except exceptions.InvalidArgument as e:
    # 400 — bad request (invalid schema, unsupported MIME, etc.)
    print(f"Invalid input: {e}")
except exceptions.PermissionDenied as e:
    # 403 — invalid API key or missing permissions
    print(f"Auth error: {e}")
except exceptions.NotFound as e:
    # 404 — model or file not found
    print(f"Not found: {e}")
except exceptions.InternalServerError as e:
    # 500 — transient server error; retry with backoff
    print(f"Server error: {e}")
```

**Finish reasons to check**:
- `STOP` — Normal completion
- `MAX_TOKENS` — Hit `max_output_tokens`
- `SAFETY` — Blocked by safety filters
- `RECITATION` — Blocked for recitation policy
- `OTHER` — Unspecified

---

## 22. Multimodal Input Size Limits

| Modality | Inline limit | File API limit |
|---|---|---|
| Image | 20 MB | 20 MB |
| Audio | 20 MB | 2 GB |
| Video | 20 MB | 2 GB |
| PDF | 20 MB | 300 MB (3,600 pages) |
| Text files | 20 MB | 2 GB |

**Images per request**: Up to 3,600 images (Gemini 1.5+)
**Video per request**: Up to 1 hour of video

---

## 23. Common Patterns

### RAG with Gemini Embeddings

```python
# Embed your documents
embeddings = []
for chunk in document_chunks:
    result = client.models.embed_content(
        model="text-embedding-004",
        contents=chunk,
        config={"task_type": "RETRIEVAL_DOCUMENT"}
    )
    embeddings.append(result.embeddings[0].values)

# Embed query and find nearest neighbors (use your vector DB)
query_result = client.models.embed_content(
    model="text-embedding-004",
    contents=user_query,
    config={"task_type": "RETRIEVAL_QUERY"}
)

# Then pass retrieved chunks to Gemini for synthesis
```

### Agentic ReAct Loop

```python
def run_agent(initial_query: str, max_turns: int = 10):
    messages = [{"role": "user", "parts": [{"text": initial_query}]}]

    for _ in range(max_turns):
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            config={"tools": tools, "system_instruction": agent_system_prompt},
            contents=messages
        )

        model_turn = {"role": "model", "parts": []}
        tool_results = []

        for part in response.candidates[0].content.parts:
            model_turn["parts"].append(part)
            if part.function_call:
                result = execute_tool(part.function_call.name, dict(part.function_call.args))
                tool_results.append({
                    "function_response": {"name": part.function_call.name, "response": result}
                })

        messages.append(model_turn)

        if not tool_results:
            return response.text  # Final answer

        messages.append({"role": "user", "parts": tool_results})

    return "Max turns reached"
```

### Multimodal Document Pipeline

```python
def analyze_document(file_path: str, questions: list[str]) -> dict:
    # Upload once, query multiple times
    uploaded = client.files.upload(path=file_path)

    # Wait for processing
    while uploaded.state.name == "PROCESSING":
        time.sleep(2)
        uploaded = client.files.get(name=uploaded.name)

    results = {}
    for question in questions:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                {"parts": [
                    {"file_data": {"mime_type": uploaded.mime_type, "file_uri": uploaded.uri}},
                    {"text": question}
                ]}
            ]
        )
        results[question] = response.text

    client.files.delete(name=uploaded.name)
    return results
```

---

## 24. Key Constraints & Gotchas

- **Stateless API**: Each `generate_content` call is independent. Multi-turn requires passing full history.
- **File API 48h TTL**: Files auto-delete; store URIs in your DB if reusing across sessions.
- **Thinking tokens billed separately**: Budget them explicitly to avoid surprise costs.
- **Google Search + function calling**: Cannot be used in the same request. Choose one.
- **Context caching minimum**: 32,768 tokens required to be cache-eligible.
- **Image token cost**: A 1024×1024 image costs ~258 tokens baseline + grid cells.
- **PDF page limit**: 3,600 pages max; each page costs ~258 tokens.
- **Live API session limit**: 15 minutes max; reconnect for longer sessions.
- **Structured output with enums**: Define enums as `{"type": "string", "enum": ["A", "B", "C"]}`.
- **`response_schema` disables streaming**: JSON mode with a strict schema blocks streaming.
- **`BLOCK_NONE` safety requires allowlisting**: Must be enabled via Google Cloud console for production.
