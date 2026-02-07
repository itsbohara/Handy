import { useState, useEffect, useCallback } from "react";
import { commands, SttApiSettings } from "@/bindings";
import { useSettings } from "@/hooks/useSettings";

export interface SttApiProviderOption {
  value: string;
  label: string;
}

export function useSttApiState() {
  const { getSetting, updateSetting } = useSettings();

  // Local state for form values
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");

  // Loading states
  const [isBaseUrlUpdating, setIsBaseUrlUpdating] = useState(false);
  const [isApiKeyUpdating, setIsApiKeyUpdating] = useState(false);
  const [isModelUpdating, setIsModelUpdating] = useState(false);

  // Get settings from store
  const sttApiSettings = getSetting("stt_api") as SttApiSettings | undefined;
  const providers = sttApiSettings?.providers ?? [];
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const isCustomProvider = selectedProvider?.id === "custom";

  // Build provider options
  const providerOptions: SttApiProviderOption[] = providers.map((p) => ({
    value: p.id,
    label: p.label,
  }));

  // Initialize from settings
  useEffect(() => {
    if (sttApiSettings) {
      setSelectedProviderId(sttApiSettings.provider_id);

      const currentProvider = sttApiSettings.providers.find(
        (p) => p.id === sttApiSettings.provider_id,
      );
      if (currentProvider) {
        setBaseUrl(currentProvider.base_url);
      }

      const currentApiKey =
        sttApiSettings.api_keys[sttApiSettings.provider_id] ?? "";
      setApiKey(currentApiKey);

      const currentModel =
        sttApiSettings.models[sttApiSettings.provider_id] ?? "whisper-1";
      setModel(currentModel);
    }
  }, [sttApiSettings?.provider_id]);

  // Handle provider selection
  const handleProviderSelect = useCallback(
    async (providerId: string) => {
      if (!providerId || !sttApiSettings) return;

      try {
        await commands.setSttApiProvider(providerId);
        updateSetting("stt_api", {
          ...sttApiSettings,
          provider_id: providerId,
        });
        setSelectedProviderId(providerId);

        // Update base URL and API key for new provider
        const provider = providers.find((p) => p.id === providerId);
        if (provider) {
          setBaseUrl(provider.base_url);
          const providerApiKey = sttApiSettings?.api_keys[providerId] ?? "";
          setApiKey(providerApiKey);
          const providerModel =
            sttApiSettings?.models[providerId] ?? "whisper-1";
          setModel(providerModel);
        }
      } catch (error) {
        console.error("Failed to set STT API provider:", error);
      }
    },
    [providers, sttApiSettings, updateSetting],
  );

  // Handle base URL change
  const handleBaseUrlChange = useCallback(
    async (newBaseUrl: string) => {
      if (!isCustomProvider || !selectedProviderId) return;

      setIsBaseUrlUpdating(true);
      setBaseUrl(newBaseUrl);

      try {
        await commands.setSttApiBaseUrl(selectedProviderId, newBaseUrl);
        // Update local state
        if (sttApiSettings) {
          const updatedProviders = sttApiSettings.providers.map((p) =>
            p.id === selectedProviderId ? { ...p, base_url: newBaseUrl } : p,
          );
          updateSetting("stt_api", {
            ...sttApiSettings,
            providers: updatedProviders,
          });
        }
      } catch (error) {
        console.error("Failed to update base URL:", error);
      } finally {
        setIsBaseUrlUpdating(false);
      }
    },
    [isCustomProvider, selectedProviderId, sttApiSettings, updateSetting],
  );

  // Handle API key change
  const handleApiKeyChange = useCallback(
    async (newApiKey: string) => {
      if (!selectedProviderId) return;

      setIsApiKeyUpdating(true);
      setApiKey(newApiKey);

      try {
        await commands.setSttApiKey(selectedProviderId, newApiKey);
        if (sttApiSettings) {
          updateSetting("stt_api", {
            ...sttApiSettings,
            api_keys: {
              ...sttApiSettings.api_keys,
              [selectedProviderId]: newApiKey,
            },
          });
        }
      } catch (error) {
        console.error("Failed to update API key:", error);
      } finally {
        setIsApiKeyUpdating(false);
      }
    },
    [selectedProviderId, sttApiSettings, updateSetting],
  );

  // Handle model change
  const handleModelChange = useCallback(
    async (newModel: string) => {
      if (!selectedProviderId) return;

      setIsModelUpdating(true);
      setModel(newModel);

      try {
        await commands.setSttApiModel(selectedProviderId, newModel);
        if (sttApiSettings) {
          updateSetting("stt_api", {
            ...sttApiSettings,
            models: {
              ...sttApiSettings.models,
              [selectedProviderId]: newModel,
            },
          });
        }
      } catch (error) {
        console.error("Failed to update model:", error);
      } finally {
        setIsModelUpdating(false);
      }
    },
    [selectedProviderId, sttApiSettings, updateSetting],
  );

  return {
    // State
    selectedProviderId,
    selectedProvider,
    isCustomProvider,
    providerOptions,
    baseUrl,
    apiKey,
    model,

    // Loading states
    isBaseUrlUpdating,
    isApiKeyUpdating,
    isModelUpdating,

    // Handlers
    handleProviderSelect,
    handleBaseUrlChange,
    handleApiKeyChange,
    handleModelChange,
  };
}
