import React from "react";
import { useTranslation } from "react-i18next";
import { useSttApiState } from "./useSttApiState";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";

import {
  SettingContainer,
  SettingsGroup,
  ToggleSwitch,
} from "@/components/ui";
import { ProviderSelect } from "../PostProcessingSettingsApi/ProviderSelect";
import { BaseUrlField } from "../PostProcessingSettingsApi/BaseUrlField";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";
import { Input } from "@/components/ui/Input";

export const SttApiSettingsComponent: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();
  const {
    selectedProvider,
    isCustomProvider,
    providerOptions,
    baseUrl,
    apiKey,
    model,
    isBaseUrlUpdating,
    isApiKeyUpdating,
    isModelUpdating,
    handleProviderSelect,
    handleBaseUrlChange,
    handleApiKeyChange,
    handleModelChange,
  } = useSttApiState();

  const sttApiSettings = getSetting("stt_api");
  const isEnabled = sttApiSettings?.enabled ?? false;

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      await commands.setSttApiEnabled(enabled);
      updateSetting("stt_api", {
        ...sttApiSettings,
        enabled,
      });
    } catch (error) {
      console.error("Failed to toggle STT API:", error);
    }
  };

  return (
    <div className="space-y-6">
      <SettingContainer
        title={t("settings.sttApi.enabled.title")}
        description={t("settings.sttApi.enabled.description")}
        descriptionMode="tooltip"
        layout="horizontal"
        grouped={true}
      >
        <ToggleSwitch
          checked={isEnabled}
          onChange={handleToggleEnabled}
        />
      </SettingContainer>

      {isEnabled && (
        <>
          <SettingContainer
            title={t("settings.sttApi.provider.title")}
            description={t("settings.sttApi.provider.description")}
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={true}
          >
            <div className="flex items-center gap-2">
              <ProviderSelect
                options={providerOptions}
                value={selectedProvider?.id ?? ""}
                onChange={handleProviderSelect}
              />
            </div>
          </SettingContainer>

          {isCustomProvider && (
            <SettingContainer
              title={t("settings.sttApi.baseUrl.title")}
              description={t("settings.sttApi.baseUrl.description")}
              descriptionMode="tooltip"
              layout="horizontal"
              grouped={true}
            >
              <div className="flex items-center gap-2">
                <BaseUrlField
                  value={baseUrl}
                  onBlur={handleBaseUrlChange}
                  placeholder={t("settings.sttApi.baseUrl.placeholder")}
                  disabled={isBaseUrlUpdating}
                  className="min-w-[380px]"
                />
              </div>
            </SettingContainer>
          )}

          <SettingContainer
            title={t("settings.sttApi.apiKey.title")}
            description={t("settings.sttApi.apiKey.description")}
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={true}
          >
            <div className="flex items-center gap-2">
              <ApiKeyField
                value={apiKey}
                onBlur={handleApiKeyChange}
                placeholder={t("settings.sttApi.apiKey.placeholder")}
                disabled={isApiKeyUpdating}
                className="min-w-[320px]"
              />
            </div>
          </SettingContainer>

          <SettingContainer
            title={t("settings.sttApi.model.title")}
            description={t("settings.sttApi.model.description")}
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={true}
          >
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                placeholder={t("settings.sttApi.model.placeholder")}
                variant="compact"
                disabled={isModelUpdating}
                className="min-w-[320px]"
              />
            </div>
          </SettingContainer>
        </>
      )}
    </div>
  );
};

export const SttApiSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.sttApi.title")}>
        <SttApiSettingsComponent />
      </SettingsGroup>
    </div>
  );
};

export default SttApiSettings;
