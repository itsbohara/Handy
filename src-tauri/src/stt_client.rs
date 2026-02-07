//! OpenAI-compatible Speech-to-Text API client
//!
//! This module provides HTTP client functionality for sending audio
//! to OpenAI-compatible STT endpoints (like whisper, faster-whisper, parakeet-mlx, etc.)

use crate::settings::{get_settings, SttApiProvider};
use log::{debug, error, info};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SttTranscriptionResponse {
    pub text: String,
}

/// Send audio to an OpenAI-compatible STT API endpoint
pub async fn transcribe_audio(
    provider: &SttApiProvider,
    api_key: String,
    model: &str,
    audio_samples: Vec<f32>,
    language: Option<String>,
) -> Result<String, String> {
    let base_url = provider.base_url.trim_end_matches('/');
    let url = format!("{}/audio/transcriptions", base_url);

    info!(
        "Sending STT request to {} (model: {}, language: {:?})",
        url, model, language
    );

    // Convert f32 samples to 16-bit PCM bytes for WAV
    let wav_bytes = samples_to_wav(audio_samples);

    // Build the multipart form
    let client = reqwest::Client::new();
    let mut form = reqwest::multipart::Form::new()
        .part(
            "file",
            reqwest::multipart::Part::bytes(wav_bytes)
                .file_name("audio.wav")
                .mime_str("audio/wav")
                .map_err(|e| format!("Failed to create file part: {}", e))?,
        )
        .text("model", model.to_string());

    // Add optional parameters
    if let Some(lang) = language {
        if lang != "auto" && !lang.is_empty() {
            form = form.text("language", lang);
        }
    }

    // Add response format for text output
    form = form.text("response_format", "json");

    // Build request
    let mut request = client.post(&url).multipart(form);

    // Add authorization header if API key is provided
    if !api_key.trim().is_empty() {
        request = request.header("Authorization", format!("Bearer {}", api_key));
    }

    debug!("Sending STT request to {}", url);

    // Send request
    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to send STT request: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        error!("STT API error ({}): {}", status, body);
        return Err(format!("STT API error ({}): {}", status, body));
    }

    debug!("STT API response: {}", body);

    // Parse the response
    let transcription: SttTranscriptionResponse = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse STT response: {}. Body: {}", e, body))?;

    let text = transcription.text.trim().to_string();

    if text.is_empty() {
        return Err("STT API returned empty transcription".to_string());
    }

    info!("STT transcription successful: {} chars", text.len());
    Ok(text)
}

/// Convert f32 audio samples (16kHz, mono) to WAV format bytes
fn samples_to_wav(samples: Vec<f32>) -> Vec<u8> {
    use std::io::Write;

    let sample_rate: u32 = 16000;
    let channels: u16 = 1;
    let bits_per_sample: u16 = 16;
    let bytes_per_sample = bits_per_sample / 8;

    // Convert f32 (-1.0 to 1.0) to i16
    let pcm_data: Vec<i16> = samples
        .iter()
        .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0) as i16)
        .collect();

    let data_chunk_size = pcm_data.len() as u32 * bytes_per_sample as u32;
    let byte_rate = sample_rate * channels as u32 * bytes_per_sample as u32;
    let block_align = channels * bytes_per_sample;

    let mut wav = Vec::new();

    // RIFF header
    wav.write_all(b"RIFF").unwrap();
    wav.write_all(&(36 + data_chunk_size).to_le_bytes())
        .unwrap(); // File size - 8
    wav.write_all(b"WAVE").unwrap();

    // fmt chunk
    wav.write_all(b"fmt ").unwrap();
    wav.write_all(&16u32.to_le_bytes()).unwrap(); // Subchunk1Size (16 for PCM)
    wav.write_all(&1u16.to_le_bytes()).unwrap(); // AudioFormat (1 = PCM)
    wav.write_all(&channels.to_le_bytes()).unwrap();
    wav.write_all(&sample_rate.to_le_bytes()).unwrap();
    wav.write_all(&byte_rate.to_le_bytes()).unwrap();
    wav.write_all(&block_align.to_le_bytes()).unwrap();
    wav.write_all(&bits_per_sample.to_le_bytes()).unwrap();

    // data chunk
    wav.write_all(b"data").unwrap();
    wav.write_all(&data_chunk_size.to_le_bytes()).unwrap();

    // Write PCM data
    for sample in pcm_data {
        wav.write_all(&sample.to_le_bytes()).unwrap();
    }

    wav
}

/// Transcribe audio using the configured STT API provider
pub async fn transcribe_with_stt_api(
    app_handle: &tauri::AppHandle,
    audio_samples: Vec<f32>,
) -> Result<String, String> {
    let settings = get_settings(app_handle);

    // Check if STT API is enabled
    if !settings.stt_api.enabled {
        return Err("STT API is not enabled".to_string());
    }

    // Get the active provider
    let provider = settings
        .active_stt_api_provider()
        .cloned()
        .ok_or_else(|| "No STT API provider configured".to_string())?;

    // Get the API key for this provider
    let api_key = settings
        .stt_api
        .api_keys
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    // Get the model for this provider
    let model = settings
        .stt_api
        .models
        .get(&provider.id)
        .cloned()
        .unwrap_or_else(|| "whisper-1".to_string());

    // Get the language setting
    let language = if settings.selected_language == "auto" {
        None
    } else {
        Some(settings.selected_language.clone())
    };

    transcribe_audio(&provider, api_key, &model, audio_samples, language).await
}
