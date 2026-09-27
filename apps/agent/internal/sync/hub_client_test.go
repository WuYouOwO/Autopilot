package sync

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHubClientPauseAndResume(t *testing.T) {
	pausedCalled := false
	resumedCalled := false

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/devices/dev_1/networks/net_1/pause" {
			pausedCalled = true
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.URL.Path == "/api/v1/devices/dev_1/networks/net_1/resume" {
			resumedCalled = true
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.URL.Path == "/api/v1/devices/dev_1/heartbeat" {
			resp := HeartbeatResponse{
				DeviceID:            "dev_1",
				AuthoritativeIntent: "ACTIVE",
				Timestamp:           123456,
			}
			json.NewEncoder(w).Encode(resp)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewHubClient(server.URL)
	ctx := context.Background()

	// Test Pause
	if err := client.PauseNetwork(ctx, "dev_1", "net_1"); err != nil {
		t.Fatalf("pause error: %v", err)
	}
	if !pausedCalled {
		t.Fatalf("pause endpoint was not called")
	}

	// Test Resume
	if err := client.ResumeNetwork(ctx, "dev_1", "net_1"); err != nil {
		t.Fatalf("resume error: %v", err)
	}
	if !resumedCalled {
		t.Fatalf("resume endpoint was not called")
	}

	// Test Heartbeat
	hb, err := client.SendHeartbeat(ctx, "dev_1", map[string]interface{}{"status": "ok"})
	if err != nil {
		t.Fatalf("heartbeat error: %v", err)
	}
	if hb.AuthoritativeIntent != "ACTIVE" {
		t.Fatalf("expected ACTIVE intent, got %s", hb.AuthoritativeIntent)
	}
}
