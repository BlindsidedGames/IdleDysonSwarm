export type CapabilityStatus =
  | 'required'
  | 'desktop-only'
  | 'mobile-only'
  | 'not-currently-active'

export interface PlatformCapability {
  readonly id: string
  readonly status: CapabilityStatus
  readonly unityEvidence: readonly string[]
  readonly targetBoundary: string
  readonly notes: string
}

export const platformCapabilityInventory: readonly PlatformCapability[] = [
  {
    id: 'legacy-save-discovery',
    status: 'required',
    unityEvidence: [
      'Assets/Scripts/Systems/Save/SavePaths.cs',
      'Assets/Scripts/Expansion/Oracle.StartupRecovery.cs',
    ],
    targetBoundary: 'SaveStorageAdapter.discoverLegacyCandidates',
    notes:
      'Electron and native Capacitor shells must discover idle_dyson_swarm_save.txt without prompting. Browser-only builds cannot.',
  },
  {
    id: 'transactional-save-and-recovery',
    status: 'required',
    unityEvidence: [
      'Assets/Scripts/Systems/Save/OdinStringFileStorage.cs',
      'Assets/Scripts/Systems/Save/SaveSystem.cs',
      'Assets/Scripts/Systems/Save/StartupSaveRecoveryCoordinator.cs',
    ],
    targetBoundary: 'SaveStorageAdapter',
    notes:
      'Write, verify, atomically replace, retain the original Odin file, and retain recovery candidates.',
  },
  {
    id: 'application-lifecycle',
    status: 'required',
    unityEvidence: [
      'Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs',
      'Assets/Scripts/Expansion/Oracle.Persistence.cs',
    ],
    targetBoundary: 'LifecycleAdapter',
    notes:
      'Pause, focus loss, resume and termination drive save timestamps and offline-time calculation.',
  },
  {
    id: 'steam-initialization',
    status: 'desktop-only',
    unityEvidence: ['Assets/Scripts/Systems/Platform/SteamManager.cs'],
    targetBoundary: 'Electron main-process Steam adapter',
    notes:
      'Initialization and callback pumping must remain outside the React renderer.',
  },
  {
    id: 'steam-achievements-and-stats',
    status: 'desktop-only',
    unityEvidence: [
      'Assets/Scripts/Services/ISteamIntegrationService.cs',
      'Assets/Scripts/Services/Steam/SteamIntegrationService.cs',
      'Assets/Data/Steam/Achievements',
    ],
    targetBoundary: 'AchievementAdapter',
    notes:
      'Includes unlock state, integer/float stats, exponent stats, progress indications and explicit flush.',
  },
  {
    id: 'steam-rich-presence',
    status: 'desktop-only',
    unityEvidence: [
      'Assets/Scripts/Services/Steam/SteamIntegrationService.cs',
    ],
    targetBoundary: 'PresenceAdapter',
    notes: 'Progression-tier status and clear-on-exit behavior.',
  },
  {
    id: 'safe-area-and-orientation',
    status: 'mobile-only',
    unityEvidence: [
      'Assets/Scripts/User Interface/ScreenSafeArea.cs',
      'Assets/Scripts/Systems/Platform/DeviceRotationManager.cs',
    ],
    targetBoundary: 'DisplayAdapter plus CSS env(safe-area-inset-*)',
    notes: 'Retain responsive portrait and landscape behavior.',
  },
  {
    id: 'touch-pan-zoom-and-hold',
    status: 'mobile-only',
    unityEvidence: [
      'Assets/Scripts/Blindsided/Utilities/PanAndZoom.cs',
      'Assets/Scripts/Systems/PinchableScrollRect.cs',
      'Assets/Scripts/User Interface/QuantumUpgradeUI.cs',
    ],
    targetBoundary: 'Pointer Events in React/SVG/Pixi surfaces',
    notes: 'Includes multi-touch zoom, drag navigation, and hold-to-purchase.',
  },
  {
    id: 'audio-settings',
    status: 'required',
    unityEvidence: ['Assets/Scripts/Systems/Audio/SoundController.cs'],
    targetBoundary: 'AudioSettingsAdapter plus Web Audio/HTMLAudio',
    notes: 'Music and button volume currently live outside the main save.',
  },
  {
    id: 'clipboard-import-export',
    status: 'required',
    unityEvidence: [
      'Assets/Scripts/Expansion/Oracle.Clipboard.cs',
      'Assets/Scripts/User Interface/StartupRecoveryView.cs',
    ],
    targetBoundary: 'ClipboardAdapter',
    notes: 'Required as a recovery tool even though normal migration is automatic.',
  },
  {
    id: 'external-links',
    status: 'required',
    unityEvidence: ['Assets/Scripts/User Interface/AppStoreLink.cs'],
    targetBoundary: 'ExternalNavigationAdapter',
    notes: 'Open approved website, Discord and store destinations externally.',
  },
  {
    id: 'local-ui-preferences',
    status: 'required',
    unityEvidence: [
      'Assets/Scripts/User Interface/CategoryStateSaver.cs',
      'Assets/Scripts/Systems/Audio/SoundController.cs',
    ],
    targetBoundary: 'Platform settings/key-value adapter',
    notes: 'Category expansion and volume preferences currently use PlayerPrefs.',
  },
  {
    id: 'purchases',
    status: 'not-currently-active',
    unityEvidence: ['Assets/Scripts/UnityPurchasing/generated'],
    targetBoundary: 'No adapter until an active product flow is identified',
    notes:
      'The current source contains generated/legacy Unity Purchasing material but no active runtime purchase flow was found.',
  },
  {
    id: 'notifications',
    status: 'not-currently-active',
    unityEvidence: [],
    targetBoundary: 'No adapter currently required',
    notes: 'No active notification scheduling surface was found in Assets/Scripts.',
  },
  {
    id: 'cloud-save',
    status: 'not-currently-active',
    unityEvidence: ['ProjectSettings/ProjectSettings.asset'],
    targetBoundary: 'No adapter until a live cloud-save contract is identified',
    notes:
      'A CLOUDONCE_GOOGLE scripting symbol exists, but no active cloud-save implementation was found in the current C# surface.',
  },
] as const
