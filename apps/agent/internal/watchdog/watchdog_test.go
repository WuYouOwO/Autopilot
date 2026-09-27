package watchdog

import (
	"context"
	"testing"
	"time"

	"autopilot/agent/internal/config"
	"autopilot/agent/internal/rpc"
)

func TestWatchdogRollbackOnTimeout(t *testing.T) {
	mockRpc := rpc.NewMockEasyTierRpcClient()
	
	// Original healthy config
	healthyConfig := &config.Config{
		NetworkID:     "net_healthy",
		NetworkSecret: "pass123",
		VirtualIPv4:   "10.144.0.1",
	}

	rollbackTriggered := make(chan bool, 1)
	watchdog := NewWatchdog(100*time.Millisecond, mockRpc, func(err error) {
		rollbackTriggered <- true
	})

	// 1. Arm transaction with healthy config
	watchdog.ArmTransaction(healthyConfig)

	if !watchdog.IsArmed() {
		t.Fatalf("watchdog should be armed")
	}

	// 2. Wait for timeout to fire
	select {
	case <-rollbackTriggered:
		// Succeeded in triggering rollback
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("rollback was not triggered in time")
	}

	// Verify mockRpc now has the healthy config restored
	instances, err := mockRpc.ListNetworkInstances(context.Background())
	if err != nil || len(instances) != 1 || instances[0] != "net_healthy" {
		t.Fatalf("expected net_healthy to be restored, got %v", instances)
	}
}

func TestWatchdogCommitDisarms(t *testing.T) {
	mockRpc := rpc.NewMockEasyTierRpcClient()
	healthyConfig := &config.Config{
		NetworkID: "net_healthy",
	}

	rollbackTriggered := false
	watchdog := NewWatchdog(100*time.Millisecond, mockRpc, func(err error) {
		rollbackTriggered = true
	})

	watchdog.ArmTransaction(healthyConfig)
	// Handshake succeeds -> Commit
	watchdog.Commit()

	time.Sleep(150 * time.Millisecond)
	if rollbackTriggered {
		t.Fatalf("rollback should NOT have triggered after commit")
	}
	if watchdog.IsArmed() {
		t.Fatalf("watchdog should no longer be armed")
	}
}
