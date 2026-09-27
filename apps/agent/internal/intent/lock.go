package intent

import (
	"errors"
	"sync"
	"time"

	"autopilot/agent/internal/config"
)

type IntentState string

const (
	StateActive        IntentState = "ACTIVE"
	StateUserPaused    IntentState = "USER_PAUSED"
	StateAdminDisabled IntentState = "ADMIN_DISABLED"
)

var (
	ErrRevivalSuppressed = errors.New("heartbeat revival suppressed: workstation user has paused the network")
	ErrHeadlessNoPause   = errors.New("server / headless persona does not allow local pause: managed centrally")
	ErrAdminRevoked      = errors.New("device is disabled by central admin policy")
)

// IntentLock provides memory-level latching and filtering of stray heartbeats.
type IntentLock struct {
	mu           sync.RWMutex
	persona      config.PersonaType
	currentState IntentState
	lastChanged  time.Time
}

func NewIntentLock(persona config.PersonaType) *IntentLock {
	return &IntentLock{
		persona:      persona,
		currentState: StateActive,
		lastChanged:  time.Now(),
	}
}

// GetState returns current local intent state
func (l *IntentLock) GetState() IntentState {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.currentState
}

// PauseByLocalUser executes instant local pause intent
func (l *IntentLock) PauseByLocalUser() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.currentState == StateAdminDisabled {
		return ErrAdminRevoked
	}
	if l.persona == config.PersonaServerHeadless {
		return ErrHeadlessNoPause
	}

	l.currentState = StateUserPaused
	l.lastChanged = time.Now()
	return nil
}

// ResumeByLocalUser executes instant local resume intent
func (l *IntentLock) ResumeByLocalUser() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.currentState == StateAdminDisabled {
		return ErrAdminRevoked
	}

	l.currentState = StateActive
	l.lastChanged = time.Now()
	return nil
}

// HandleInboundHeartbeat filters incoming 3.5s gateway revival heartbeats
func (l *IntentLock) HandleInboundHeartbeat() error {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if l.currentState == StateAdminDisabled {
		return ErrAdminRevoked
	}

	// Local Intent Lock: if Workstation is paused, block revival!
	if l.currentState == StateUserPaused {
		if l.persona == config.PersonaWorkstationInteractive {
			return ErrRevivalSuppressed
		}
	}

	return nil
}

// AdminRevoke sets state to ADMIN_DISABLED
func (l *IntentLock) AdminRevoke() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.currentState = StateAdminDisabled
	l.lastChanged = time.Now()
}
