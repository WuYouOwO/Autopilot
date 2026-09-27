package sync

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type HubClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewHubClient(baseURL string) *HubClient {
	return &HubClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type HeartbeatResponse struct {
	DeviceID            string `json:"deviceId"`
	AuthoritativeIntent string `json:"authoritativeIntent"` // 'ACTIVE' | 'USER_PAUSED' | 'ADMIN_DISABLED'
	Timestamp           int64  `json:"timestamp"`
}

// PauseNetwork sends out-of-band async update to Cloudflare Workers / Hub D1 (30~50ms)
func (h *HubClient) PauseNetwork(ctx context.Context, deviceID, networkID string) error {
	url := fmt.Sprintf("%s/api/v1/devices/%s/networks/%s/pause", h.baseURL, deviceID, networkID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return err
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("out-of-band pause report failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("hub returned status %d on pause", resp.StatusCode)
	}
	return nil
}

// ResumeNetwork sends resume intent
func (h *HubClient) ResumeNetwork(ctx context.Context, deviceID, networkID string) error {
	url := fmt.Sprintf("%s/api/v1/devices/%s/networks/%s/resume", h.baseURL, deviceID, networkID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return err
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("out-of-band resume report failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("hub returned status %d on resume", resp.StatusCode)
	}
	return nil
}

// SendHeartbeat reports telemetry and returns authoritative intent
func (h *HubClient) SendHeartbeat(ctx context.Context, deviceID string, telemetry map[string]interface{}) (*HeartbeatResponse, error) {
	url := fmt.Sprintf("%s/api/v1/devices/%s/heartbeat", h.baseURL, deviceID)
	payload := map[string]interface{}{
		"actor":     "AGENT",
		"telemetry": telemetry,
	}
	data, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var hbResp HeartbeatResponse
	if err := json.NewDecoder(resp.Body).Decode(&hbResp); err != nil {
		return nil, err
	}
	return &hbResp, nil
}
