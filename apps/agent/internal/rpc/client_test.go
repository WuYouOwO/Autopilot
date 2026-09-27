package rpc

import (
	"context"
	"testing"
)

func TestMockEasyTierRpcClientLifecycle(t *testing.T) {
	client := NewMockEasyTierRpcClient()
	ctx := context.Background()

	// 1. Run instance in memory
	err := client.RunNetworkInstance(ctx, &RunNetworkReq{
		InstanceID:    "inst_test",
		NetworkName:   "test_net",
		NetworkSecret: "secret123",
		IPv4Addr:      "10.144.0.10",
		IPv6Addr:      "fd00::10",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	instances, err := client.ListNetworkInstances(ctx)
	if err != nil || len(instances) != 1 || instances[0] != "inst_test" {
		t.Fatalf("expected inst_test, got %v", instances)
	}

	// 2. Delete instance in memory (<10ms release)
	err = client.DeleteNetworkInstance(ctx, "inst_test")
	if err != nil {
		t.Fatalf("delete error: %v", err)
	}

	instances, err = client.ListNetworkInstances(ctx)
	if err != nil || len(instances) != 0 {
		t.Fatalf("expected empty instances after delete, got %v", instances)
	}
}
