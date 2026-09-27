package rpc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type EasyTierRpcClient interface {
	RunNetworkInstance(ctx context.Context, req *RunNetworkReq) error
	DeleteNetworkInstance(ctx context.Context, instanceId string) error
	ListNetworkInstances(ctx context.Context) ([]string, error)
}

type RunNetworkReq struct {
	InstanceID    string   `json:"instance_id"`
	NetworkName   string   `json:"network_name"`
	NetworkSecret string   `json:"network_secret"`
	IPv4Addr      string   `json:"ipv4_addr,omitempty"`
	IPv6Addr      string   `json:"ipv6_addr,omitempty"`
	Peers         []string `json:"peers,omitempty"`
}

type RealEasyTierRpcClient struct {
	portalURL  string
	httpClient *http.Client
}

func NewRealEasyTierRpcClient(port int) *RealEasyTierRpcClient {
	return &RealEasyTierRpcClient{
		portalURL: fmt.Sprintf("http://127.0.0.1:%d", port),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// DeleteNetworkInstance calls native RPC to release TUN handle and Noise tunnel in memory (<10ms)
// Guardrail: Never touches OS network interface commands directly!
func (c *RealEasyTierRpcClient) DeleteNetworkInstance(ctx context.Context, instanceId string) error {
	payload := map[string]string{"instance_id": instanceId}
	data, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.portalURL+"/api/v1/delete_network_instance", bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("rpc call delete_network_instance failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete_network_instance error (%d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// RunNetworkInstance calls native RPC to instantiate network in memory
func (c *RealEasyTierRpcClient) RunNetworkInstance(ctx context.Context, req *RunNetworkReq) error {
	data, err := json.Marshal(req)
	if err != nil {
		return err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.portalURL+"/api/v1/run_network_instance", bytes.NewReader(data))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("rpc call run_network_instance failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("run_network_instance error (%d): %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *RealEasyTierRpcClient) ListNetworkInstances(ctx context.Context) ([]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.portalURL+"/api/v1/list_network_instance", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Instances []string `json:"instances"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Instances, nil
}

// MockEasyTierRpcClient for unit testing and offline simulation
type MockEasyTierRpcClient struct {
	runningInstances map[string]*RunNetworkReq
}

func NewMockEasyTierRpcClient() *MockEasyTierRpcClient {
	return &MockEasyTierRpcClient{
		runningInstances: make(map[string]*RunNetworkReq),
	}
}

func (m *MockEasyTierRpcClient) RunNetworkInstance(ctx context.Context, req *RunNetworkReq) error {
	m.runningInstances[req.InstanceID] = req
	return nil
}

func (m *MockEasyTierRpcClient) DeleteNetworkInstance(ctx context.Context, instanceId string) error {
	delete(m.runningInstances, instanceId)
	return nil
}

func (m *MockEasyTierRpcClient) ListNetworkInstances(ctx context.Context) ([]string, error) {
	res := make([]string, 0, len(m.runningInstances))
	for id := range m.runningInstances {
		res = append(res, id)
	}
	return res, nil
}
