package watchdog

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"autopilot/agent/internal/config"
	"autopilot/agent/internal/rpc"
)

var (
	ErrWatchdogTimeout = errors.New("safety watchdog timed out: rollback executed")
)

type ConfigApplier interface {
	ApplyConfig(ctx context.Context, cfg *config.Config) error
}

type Watchdog struct {
	mu           sync.Mutex
	timeout      time.Duration
	timer        *time.Timer
	backupConfig *config.Config
	rpcClient    rpc.EasyTierRpcClient
	isArmed      bool
	onRollback   func(err error)
}

func NewWatchdog(timeout time.Duration, rpcClient rpc.EasyTierRpcClient, onRollback func(err error)) *Watchdog {
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	return &Watchdog{
		timeout:    timeout,
		rpcClient:  rpcClient,
		onRollback: onRollback,
	}
}

// ArmTransaction starts the 60-second countdown with backup config
func (w *Watchdog) ArmTransaction(currentHealthyConfig *config.Config) {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Clone config
	copied := *currentHealthyConfig
	w.backupConfig = &copied
	w.isArmed = true

	if w.timer != nil {
		w.timer.Stop()
	}

	w.timer = time.AfterFunc(w.timeout, func() {
		w.executeRollback()
	})
}

// Commit disarms the watchdog when connectivity is validated
func (w *Watchdog) Commit() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !w.isArmed {
		return
	}

	if w.timer != nil {
		w.timer.Stop()
		w.timer = nil
	}
	w.isArmed = false
	w.backupConfig = nil
}

// executeRollback performs transactional rollback to backup config
func (w *Watchdog) executeRollback() {
	w.mu.Lock()
	if !w.isArmed || w.backupConfig == nil {
		w.mu.Unlock()
		return
	}

	rollbackTarget := w.backupConfig
	w.isArmed = false
	w.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Execute rollback via RPC
	err := w.rpcClient.RunNetworkInstance(ctx, &rpc.RunNetworkReq{
		InstanceID:    rollbackTarget.NetworkID,
		NetworkName:   rollbackTarget.NetworkID,
		NetworkSecret: rollbackTarget.NetworkSecret,
		IPv4Addr:      rollbackTarget.VirtualIPv4,
		IPv6Addr:      rollbackTarget.VirtualIPv6,
	})

	if w.onRollback != nil {
		if err != nil {
			w.onRollback(fmt.Errorf("rollback failed: %w", err))
		} else {
			w.onRollback(ErrWatchdogTimeout)
		}
	}
}

func (w *Watchdog) IsArmed() bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.isArmed
}
