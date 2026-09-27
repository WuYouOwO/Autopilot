import { z } from 'zod';

/**
 * Device Persona defines whether the device is treated as an autonomous server
 * or an interactive workstation where the user retains absolute control.
 */
export const DevicePersonaSchema = z.enum([
  'SERVER_HEADLESS',        // IDC, Cloud VM, NAS, Soft Router. Declarative SSOT, 3.5s auto-healing.
  'WORKSTATION_INTERACTIVE' // Laptop, Desktop, Mobile. User rights first, instant toggle, pause sync.
]);

export type DevicePersona = z.infer<typeof DevicePersonaSchema>;

export const PersonaCapabilities = {
  SERVER_HEADLESS: {
    allowLocalPause: false,
    autoReviveOnHeartbeat: true,
    requireAdminConsentToDisconnect: true,
    heartbeatIntervalMs: 3500,
    description: 'Server / Headless mode: Managed strictly by central control with 3.5s self-healing.'
  },
  WORKSTATION_INTERACTIVE: {
    allowLocalPause: true,
    autoReviveOnHeartbeat: false, // Prevent forced revive when user paused
    requireAdminConsentToDisconnect: false,
    heartbeatIntervalMs: 10000,
    description: 'Workstation / Interactive mode: Local control supreme. Instant toggle with async pause sync.'
  }
} as const;
