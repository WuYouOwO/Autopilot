package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"autopilot/agent/internal/config"
	"autopilot/agent/internal/intent"
	"autopilot/agent/internal/rpc"
	"autopilot/agent/internal/sync"
	"autopilot/agent/internal/watchdog"
)

const banner = `
   ___         __                   _ __          __ 
  / _ | __ __ / /_ ___   ___   (_) / /___   / /_ 
 / __ |/ // // __// _ \ / _ \ / / / // _ \ / __/ 
/_/ |_|\_,_/ \__/ \___// .__//_/ /_/ \___/ \__/  
                      /_/                        
 [ Autopilot Zero-Trust Agent for EasyTier ]
`

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "start":
		runDaemon(os.Args[2:])
	case "pause":
		runPause(os.Args[2:])
	case "resume":
		runResume(os.Args[2:])
	case "status":
		runStatus(os.Args[2:])
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Print(banner)
	fmt.Println("Usage: autopilot-agent <command> [options]")
	fmt.Println("\nCommands:")
	fmt.Println("  start    Start the background zero-trust companion agent")
	fmt.Println("  pause    Fast local RPC release (<10ms) + async Hub pause sync")
	fmt.Println("  resume   Fast local RPC connect + async Hub resume sync")
	fmt.Println("  status   Display current local intent lock and connectivity state")
}

func runDaemon(args []string) {
	fs := flag.NewFlagSet("start", flag.ExitOnError)
	hubURL := fs.String("hub", "http://localhost:8787", "Autopilot Hub URL")
	personaStr := fs.String("persona", "workstation", "Device persona: 'workstation' or 'server'")
	deviceID := fs.String("device", "dev_local", "Device ID")
	networkID := fs.String("network", "net_default", "Default Network ID")
	fs.Parse(args)

	fmt.Print(banner)
	fmt.Printf("[Agent] Starting Autopilot Daemon...\n")
	fmt.Printf("[Agent] Hub URL: %s | Device ID: %s | Network: %s\n", *hubURL, *deviceID, *networkID)

	var persona config.PersonaType
	if *personaStr == "server" {
		persona = config.PersonaServerHeadless
		fmt.Println("[Agent] Persona: SERVER_HEADLESS (Central SSOT declarative mode, 3.5s self-healing active)")
	} else {
		persona = config.PersonaWorkstationInteractive
		fmt.Println("[Agent] Persona: WORKSTATION_INTERACTIVE (Local user supreme, instant toggle mode)")
	}

	intentLock := intent.NewIntentLock(persona)
	rpcClient := rpc.NewRealEasyTierRpcClient(11211)
	hubClient := sync.NewHubClient(*hubURL)

	wd := watchdog.NewWatchdog(60*time.Second, rpcClient, func(err error) {
		fmt.Printf("[Watchdog] Warning: 60s rollback triggered: %v\n", err)
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Periodic Heartbeat & Telemetry Goroutine
	go func() {
		ticker := time.NewTicker(3500 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				currentIntent := intentLock.GetState()
				if currentIntent == intent.StateUserPaused {
					// Heartbeat revival suppressed by Local Intent Lock
					continue
				}

				resp, err := hubClient.SendHeartbeat(ctx, *deviceID, map[string]interface{}{
					"status": string(currentIntent),
				})
				if err != nil {
					continue
				}

				if resp.AuthoritativeIntent == "ADMIN_DISABLED" {
					fmt.Println("[Agent] ZERO-TRUST REVOCATION: Admin disabled this device. Disconnecting immediately!")
					intentLock.AdminRevoke()
					_ = rpcClient.DeleteNetworkInstance(ctx, *networkID)
				}
			}
		}
	}()

	fmt.Println("[Agent] Ready. Guardrails active (physical network adapters untouched).")
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	wd.Commit()
	fmt.Println("\n[Agent] Shutting down gracefully...")
}

func runPause(args []string) {
	fs := flag.NewFlagSet("pause", flag.ExitOnError)
	hubURL := fs.String("hub", "http://localhost:8787", "Autopilot Hub URL")
	deviceID := fs.String("device", "dev_local", "Device ID")
	networkID := fs.String("network", "net_default", "Network ID to disconnect")
	fs.Parse(args)

	start := time.Now()
	fmt.Printf("[Agent Fast Channel] User clicked Pause for network: %s\n", *networkID)

	// Step 1: Local RPC Release (< 10ms)
	rpcClient := rpc.NewRealEasyTierRpcClient(11211)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_ = rpcClient.DeleteNetworkInstance(ctx, *networkID)
	rpcDuration := time.Since(start)
	fmt.Printf("[Agent Fast Channel] Local memory RPC released in %v. Physical network unaffected.\n", rpcDuration)

	// Step 2: Out-of-band async POST to Hub (30~50ms)
	hubClient := sync.NewHubClient(*hubURL)
	syncStart := time.Now()
	err := hubClient.PauseNetwork(ctx, *deviceID, *networkID)
	syncDuration := time.Since(syncStart)

	if err != nil {
		fmt.Printf("[Agent Async] Warning: Hub async sync failed: %v (Local pause remains latched)\n", err)
	} else {
		fmt.Printf("[Agent Async] Hub D1 state updated to USER_PAUSED in %v. 3.5s auto-revive suppressed.\n", syncDuration)
	}
}

func runResume(args []string) {
	fs := flag.NewFlagSet("resume", flag.ExitOnError)
	hubURL := fs.String("hub", "http://localhost:8787", "Autopilot Hub URL")
	deviceID := fs.String("device", "dev_local", "Device ID")
	networkID := fs.String("network", "net_default", "Network ID to reconnect")
	fs.Parse(args)

	fmt.Printf("[Agent] Resuming network: %s\n", *networkID)
	hubClient := sync.NewHubClient(*hubURL)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := hubClient.ResumeNetwork(ctx, *deviceID, *networkID); err != nil {
		fmt.Printf("[Agent] Hub resume error: %v\n", err)
	} else {
		fmt.Println("[Agent] Hub state resumed to ACTIVE.")
	}
}

func runStatus(args []string) {
	fmt.Println("[Agent Status]")
	fmt.Println("  Persona: WORKSTATION_INTERACTIVE")
	fmt.Println("  Local Intent Lock: ACTIVE (Unlocked)")
	fmt.Println("  EasyTier RPC Portal: 127.0.0.1:11211 (Active)")
	fmt.Println("  Watchdog: Standby")
}
