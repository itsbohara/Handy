# STT API Implementation Summary

## Feature: Custom OpenAI-Compatible STT API Endpoint Support

### Overview
Added support for using external OpenAI-compatible STT API endpoints (e.g., parakeet-mlx) instead of local models. This allows users to offload transcription to a remote/local server.

### Implementation Details

#### Backend (Rust)

1. **settings.rs**
   - Added `SttApiProvider` struct with `id`, `label`, `base_url`, `allow_base_url_edit` fields
   - Added `SttApiSettings` struct with `enabled`, `provider_id`, `providers`, `api_keys`, `models` fields
   - Default providers: OpenAI (`https://api.openai.com/v1`) and Custom (`http://localhost:8000/v1`)
   - Added helper methods: `active_stt_api_provider()`, `stt_api_provider()`, `stt_api_provider_mut()`

2. **stt_client.rs** (new file)
   - `transcribe_audio()` - sends WAV audio to `/v1/audio/transcriptions` endpoint
   - `samples_to_wav()` - converts f32 audio samples to WAV format (16kHz, mono, 16-bit PCM)
   - `transcribe_with_stt_api()` - main entry point that uses settings to configure the API call
   - Supports language, model, and API key parameters

3. **transcription.rs**
   - Added `EngineType::Api` variant
   - API models skip local loading (return error if attempted)

4. **actions.rs**
   - Modified `TranscribeAction::stop()` to check if STT API is enabled
   - If enabled, calls `transcribe_with_stt_api().await` directly in async context
   - Falls back to local `tm.transcribe()` if disabled

5. **model.rs**
   - Added "api" model with `EngineType::Api`
   - `is_downloaded: true` (always available, no download needed)
   - `url: None` (no download URL)

6. **commands/stt_api.rs** (new file)
   - `get_stt_api_settings`
   - `set_stt_api_enabled`
   - `set_stt_api_provider`
   - `set_stt_api_base_url`
   - `set_stt_api_key`
   - `set_stt_api_model`

7. **lib.rs**
   - Registered all new commands
   - Added `mod stt_client`

8. **Cargo.toml**
   - Added "multipart" feature to reqwest for file upload support

#### Frontend (React/TypeScript)

1. **SttApiSettings/** (new component)
   - Toggle to enable/disable STT API
   - Provider selector (OpenAI, Custom)
   - Base URL field (for custom provider)
   - API key input (password field)
   - Model name input
   - `useSttApiState` hook for managing form state

2. **Sidebar.tsx**
   - Added "STT API" section with Server icon
   - Section ID: `sttapi`

3. **ModelSelector.tsx**
   - Fetches STT API settings to display API model info
   - When API model selected: shows "Custom - Whisper-123234" format
   - API model status is always "ready" (no local loading)
   - Handles all status cases: ready, unloaded, none, default

4. **settings/index.ts**
   - Exported `SttApiSettings` component

5. **i18n translations (en/translation.json)**
   - `sidebar.sttApi`: "STT API"
   - `settings.sttApi.*`: All UI labels and descriptions
   - `onboarding.models.api`: Model name and description for onboarding

### How It Works

**Flow:**
1. User selects "External API" model from model selector
2. User goes to "STT API" settings section
3. User enables "Use External STT API"
4. User selects "Custom" provider
5. User sets Base URL (e.g., `http://localhost:8000/v1`)
6. User sets Model name (e.g., `Whisper-123234`)
7. User presses Cmd+Space to record
8. Audio is recorded and converted to WAV
9. WAV file is sent via multipart/form-data POST to `{base_url}/audio/transcriptions`
10. API returns JSON with `text` field
11. Text is post-processed (word correction, filler word filtering)
12. Text is pasted to active window

**Request Format:**
```
POST /v1/audio/transcriptions
Content-Type: multipart/form-data

file: <audio.wav>
model: <model_name>
language: <optional_language_code>
response_format: json
```

**Response Format:**
```json
{
  "text": "Transcribed text here"
}
```

### Testing with parakeet-mlx

1. Start your parakeet-mlx server:
   ```bash
   cd /Users/itsbohara/ai/parakeet-mlx
   # Start the server on port 8000
   ```

2. Open Handy and select "External API" model

3. Go to Settings → STT API
   - Enable "Use External STT API"
   - Select "Custom" provider
   - Base URL: `http://localhost:8000/v1`
   - Model: `whisper-1` (or your model name)

4. Press Cmd+Space, speak, release

5. Check logs:
   - Look for: `Sending STT request to http://localhost:8000/v1/audio/transcriptions`
   - Look for: `STT transcription successful: X chars`

### Known Issues / Notes

1. **Runtime Panic (Fixed)**: Cannot start a runtime from within a runtime
   - Solution: Handle STT API call in async context in `actions.rs` instead of trying to block in `transcription.rs`

2. **Model Status Display**: API model status is always "ready" since no local loading is needed

3. **Audio Format**: Sends 16kHz, mono, 16-bit PCM WAV

4. **Language**: Supports language parameter if API supports it

### Files Modified

**Backend:**
- src-tauri/src/settings.rs
- src-tauri/src/stt_client.rs (new)
- src-tauri/src/transcription.rs
- src-tauri/src/actions.rs
- src-tauri/src/managers/model.rs
- src-tauri/src/commands/stt_api.rs (new)
- src-tauri/src/commands/mod.rs
- src-tauri/src/lib.rs
- src-tauri/Cargo.toml

**Frontend:**
- src/components/settings/SttApiSettings/SttApiSettings.tsx (new)
- src/components/settings/SttApiSettings/useSttApiState.ts (new)
- src/components/settings/SttApiSettings/index.ts (new)
- src/components/settings/index.ts
- src/components/settings/Sidebar.tsx
- src/components/model-selector/ModelSelector.tsx
- src/i18n/locales/en/translation.json

### Verification Checklist

- [ ] External API model shows in model selector
- [ ] STT API section appears in sidebar
- [ ] Toggle enables/disables STT API
- [ ] Custom provider allows base URL editing
- [ ] API key field accepts input
- [ ] Model field accepts custom model name
- [ ] Status shows "Custom - {model_name}" when API enabled
- [ ] Recording triggers API request
- [ ] Transcription result pastes correctly
- [ ] Logs show successful API communication
