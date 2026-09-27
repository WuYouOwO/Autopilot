package intent

import (
	"testing"

	"autopilot/agent/internal/config"
)

func TestWorkstationIntentLockSuppressesRevival(t *testing.T) {
	lock := NewIntentLock(config.PersonaWorkstationInteractive)

	// Initial state is ACTIVE
	if lock.GetState() != StateActive {
		t.Fatalf("expected ACTIVE, got %s", lock.GetState())
	}

	// 1. User pauses locally (<10ms)
	if err := lock.PauseByLocalUser(); err != nil {
		t.Fatalf("pause should succeed, got %v", err)
	}
	if lock.GetState() != StateUserPaused {
		t.Fatalf("expected USER_PAUSED, got %s", lock.GetState())
	}

	// 2. Incoming 3.5s gateway heartbeat arrives
	err := lock.HandleInboundHeartbeat()
	if err != ErrRevivalSuppressed {
		t.Fatalf("expected ErrRevivalSuppressed, got %v", err)
	}

	// 3. User resumes
	if err := lock.ResumeByLocalUser(); err != nil {
		t.Fatalf("resume should succeed, got %v", err)
	}
	if lock.GetState() != StateActive {
		t.Fatalf("expected ACTIVE, got %s", lock.GetState())
	}

	// 4. Heartbeat now allowed
	if err := lock.HandleInboundHeartbeat(); err != nil {
		t.Fatalf("heartbeat should be accepted, got %v", err)
	}
}

func TestServerHeadlessRejectsLocalPause(t *testing.T) {
	lock := NewIntentLock(config.PersonaServerHeadless)

	// User trying to pause on Headless Server must fail
	err := lock.PauseByLocalUser()
	if err != ErrHeadlessNoPause {
		t.Fatalf("expected ErrHeadlessNoPause, got %v", err)
	}
}

func TestAdminRevocationBlocksAll(t *testing.T) {
	lock := NewIntentLock(config.PersonaWorkstationInteractive)
	lock.AdminRevoke()

	if lock.GetState() != StateAdminDisabled {
		t.Fatalf("expected ADMIN_DISABLED")
	}

	if err := lock.ResumeByLocalUser(); err != ErrAdminRevoked {
		t.Fatalf("expected ErrAdminRevoked")
	}

	if err := lock.HandleInboundHeartbeat(); err != ErrAdminRevoked {
		t.Fatalf("expected ErrAdminRevoked on heartbeat")
	}
}
