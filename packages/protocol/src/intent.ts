import { z } from 'zod';
import { DevicePersona } from './persona.js';

/**
 * Three-state Intent State Machine:
 * - ACTIVE: Network is running, routes declared.
 * - USER_PAUSED: User deliberately disconnected locally or via mobile WAP. Gateway treats as expected sleep.
 * - ADMIN_DISABLED: Revoked centrally or failed zero-trust policy. Cannot reconnect without admin action.
 */
export const IntentStateSchema = z.enum([
  'ACTIVE',
  'USER_PAUSED',
  'ADMIN_DISABLED'
]);

export type IntentState = z.infer<typeof IntentStateSchema>;

export interface StateTransitionResult {
  allowed: boolean;
  newState: IntentState;
  reason?: string;
}

/**
 * Validate and compute state transitions based on Persona and Initiator.
 */
export function transitionIntentState(
  currentState: IntentState,
  targetState: IntentState,
  persona: DevicePersona,
  actor: 'USER' | 'ADMIN' | 'GATEWAY_HEARTBEAT'
): StateTransitionResult {
  // If disabled by Admin, only Admin can reactivate
  if (currentState === 'ADMIN_DISABLED' && actor !== 'ADMIN') {
    return {
      allowed: false,
      newState: currentState,
      reason: 'Device has been disabled by security administrator. Local reactivation rejected.'
    };
  }

  // Gateway heartbeat attempting to revive a USER_PAUSED device
  if (actor === 'GATEWAY_HEARTBEAT' && currentState === 'USER_PAUSED') {
    if (persona === 'WORKSTATION_INTERACTIVE') {
      // CRITICAL GUARD: Never resurrect interactive workstation if user intention is PAUSED!
      return {
        allowed: false,
        newState: currentState,
        reason: 'Workstation user paused the network. Heartbeat auto-revival suppressed.'
      };
    }
    // Headless server: heartbeat self-healing is allowed
    return {
      allowed: true,
      newState: 'ACTIVE',
      reason: 'Server / Headless self-healing active.'
    };
  }

  // Workstation local user pausing
  if (actor === 'USER' && targetState === 'USER_PAUSED') {
    if (persona === 'SERVER_HEADLESS') {
      return {
        allowed: false,
        newState: currentState,
        reason: 'Server / Headless devices cannot be disconnected by local toggle. Admin required.'
      };
    }
    return {
      allowed: true,
      newState: 'USER_PAUSED'
    };
  }

  // Default transition rule
  return {
    allowed: true,
    newState: targetState
  };
}
