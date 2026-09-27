package config

import (
	"encoding/json"
	"os"
)

type PersonaType string

const (
	PersonaServerHeadless         PersonaType = "SERVER_HEADLESS"
	PersonaWorkstationInteractive PersonaType = "WORKSTATION_INTERACTIVE"
)

type Config struct {
	DeviceID      string      `json:"device_id"`
	Hostname      string      `json:"hostname"`
	Persona       PersonaType `json:"persona"`
	HubURL        string      `json:"hub_url"`
	EnrollToken   string      `json:"enroll_token"`
	EasyTierRPCPort int       `json:"easytier_rpc_port"`
	EasyTierSocket  string    `json:"easytier_socket"`
	NetworkID     string      `json:"network_id"`
	NetworkSecret string      `json:"network_secret"`
	VirtualIPv4   string      `json:"virtual_ipv4"`
	VirtualIPv6   string      `json:"virtual_ipv6"`
}

func DefaultConfig() *Config {
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "autopilot-node"
	}
	return &Config{
		DeviceID:        "dev_local",
		Hostname:        hostname,
		Persona:         PersonaWorkstationInteractive,
		HubURL:          "http://localhost:8787",
		EasyTierRPCPort: 11211,
		EasyTierSocket:  "/var/run/easytier.sock",
	}
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	cfg := DefaultConfig()
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) Save(path string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}
