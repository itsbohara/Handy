use crate::settings::{get_settings, write_settings, SttApiSettings};
use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub async fn get_stt_api_settings(app_handle: AppHandle) -> Result<SttApiSettings, String> {
    let settings = get_settings(&app_handle);
    Ok(settings.stt_api)
}

#[tauri::command]
#[specta::specta]
pub async fn set_stt_api_enabled(app_handle: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = get_settings(&app_handle);
    settings.stt_api.enabled = enabled;
    write_settings(&app_handle, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_stt_api_provider(
    app_handle: AppHandle,
    provider_id: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app_handle);

    // Validate provider exists
    if settings
        .stt_api
        .providers
        .iter()
        .all(|p| p.id != provider_id)
    {
        return Err(format!("Provider '{}' not found", provider_id));
    }

    settings.stt_api.provider_id = provider_id;
    write_settings(&app_handle, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_stt_api_base_url(
    app_handle: AppHandle,
    provider_id: String,
    base_url: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app_handle);

    let provider = settings
        .stt_api_provider_mut(&provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;

    if provider.id != "custom" {
        return Err(format!(
            "Provider '{}' does not allow editing the base URL",
            provider.label
        ));
    }

    provider.base_url = base_url;
    write_settings(&app_handle, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_stt_api_key(
    app_handle: AppHandle,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app_handle);

    // Validate provider exists
    if settings
        .stt_api
        .providers
        .iter()
        .all(|p| p.id != provider_id)
    {
        return Err(format!("Provider '{}' not found", provider_id));
    }

    settings.stt_api.api_keys.insert(provider_id, api_key);
    write_settings(&app_handle, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_stt_api_model(
    app_handle: AppHandle,
    provider_id: String,
    model: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app_handle);

    // Validate provider exists
    if settings
        .stt_api
        .providers
        .iter()
        .all(|p| p.id != provider_id)
    {
        return Err(format!("Provider '{}' not found", provider_id));
    }

    settings.stt_api.models.insert(provider_id, model);
    write_settings(&app_handle, settings);
    Ok(())
}
