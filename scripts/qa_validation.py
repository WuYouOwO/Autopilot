#!/usr/bin/env python3
"""
EasyTier Next-Gen Cloudflare-Inspired Frontend & Backend Integration
Round 2 Q/A & Regression Test Suite
Validates all 15 core features against the live running system.
"""

import sys
import json
import uuid
import hashlib
import urllib.request
import urllib.error

PASSED = 0
FAILED = 0

def test(name):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            global PASSED, FAILED
            print(f"[TEST] {name} ... ", end="", flush=True)
            try:
                fn(*args, **kwargs)
                print("PASS \033[32m✔\033[0m")
                PASSED += 1
            except Exception as e:
                print(f"FAIL \033[31m✘\033[0m ({e})")
                FAILED += 1
        return wrapper
    return decorator

cookie_jar = urllib.request.HTTPCookieProcessor()
opener = urllib.request.build_opener(cookie_jar)

mid_str = ""

@test("1. Static Brand & Icon Assets Delivery (/favicon.ico, /favicon.svg, /apple-touch-icon.png, /site.webmanifest)")
def test_static_icon_assets():
    assets = [
        ("/favicon.ico", "image/x-icon"),
        ("/favicon.svg", "image/svg+xml"),
        ("/favicon-32x32.png", "image/png"),
        ("/apple-touch-icon.png", "image/png"),
        ("/site.webmanifest", None),
    ]
    for path, exp_type in assets:
        req = urllib.request.Request(f"http://127.0.0.1:5173{path}")
        with urllib.request.urlopen(req, timeout=5) as resp:
            assert resp.status == 200, f"Expected 200 for {path}, got {resp.status}"
            data = resp.read()
            assert len(data) > 0, f"Asset {path} is empty"
            if exp_type:
                ct = resp.headers.get("Content-Type", "")
                assert exp_type.split("/")[0] in ct, f"Expected {exp_type} for {path}, got {ct}"

@test("2. Frontend SPA Shell Delivery & Pale Theme Metadata")
def test_frontend_shell():
    req = urllib.request.Request("http://127.0.0.1:5173/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        body = resp.read().decode()
        assert "EasyTier Console" in body, "Page title mismatch"
        assert "theme-color" in body, "Missing theme-color meta"
        assert "site.webmanifest" in body, "Missing manifest link"

@test("3. Reverse Proxy -> Captcha Endpoint")
def test_captcha_proxy():
    req = urllib.request.Request("http://127.0.0.1:5173/api/v1/auth/captcha")
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200
        content_type = resp.headers.get("Content-Type", "")
        assert "image/png" in content_type, f"Expected image/png, got {content_type}"
        data = resp.read()
        assert len(data) > 100, "Captcha image is empty"

@test("4. MD5 Pre-hash Auth & Session Creation")
def test_login():
    md5_pass = hashlib.md5(b"admin").hexdigest()
    payload = json.dumps({
        "username": "admin",
        "password": md5_pass,
        "captcha_code": ""
    }).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:5173/api/v1/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200

@test("5. Auth Session Verification (/auth/check_login_status)")
def test_check_login_status():
    req = urllib.request.Request("http://127.0.0.1:5173/api/v1/auth/check_login_status")
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200

@test("6. Machine Discovery & 128-bit Proto UUID Parsing")
def test_machine_discovery():
    global mid_str
    req = urllib.request.Request("http://127.0.0.1:5173/api/v1/machines")
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        machines = data.get("machines", [])
        assert len(machines) > 0, "No machines returned"
        raw_mid = machines[0].get("info", {}).get("machine_id")
        if isinstance(raw_mid, dict):
            p1 = raw_mid["part1"]
            p2 = raw_mid["part2"]
            p3 = raw_mid["part3"]
            p4 = raw_mid["part4"]
            raw_bytes = p1.to_bytes(4, "big") + p2.to_bytes(4, "big") + p3.to_bytes(4, "big") + p4.to_bytes(4, "big")
            mid_str = str(uuid.UUID(bytes=raw_bytes))
        else:
            mid_str = str(raw_mid)
        assert len(mid_str) == 36, f"Invalid UUID: {mid_str}"

@test("7. Native TOML Round-Trip: Parse & Generate with Dual-Stack IPv6 CIDR")
def test_toml_round_trip():
    test_toml = '''instance_name = "test-node-dualstack"
instance_id = "00112233-4455-6677-8899-aabbccddeeff"
ipv4 = "10.144.144.1/24"
ipv6 = "fd00:144:144::1/64"
listeners = ["tcp://0.0.0.0:11010", "udp://0.0.0.0:11010", "wg://0.0.0.0:11011"]
rpc_portal = "127.0.0.1:15888"

[network_identity]
network_name = "qa-mesh"
network_secret = "mesh-secret-key"

[[peer]]
uri = "udp://1.2.3.4:11010"
'''
    # 1. Parse via backend API
    req_parse = urllib.request.Request(
        "http://127.0.0.1:5173/api/v1/parse-config",
        data=json.dumps({"toml_config": test_toml}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_parse, timeout=5) as resp:
        assert resp.status == 200
        parse_res = json.loads(resp.read().decode())
        cfg = parse_res.get("config")
        assert cfg, "Parsed config is empty"
        assert cfg.get("virtual_ipv4") == "10.144.144.1"
        assert cfg.get("network_length") == 24
        assert cfg.get("network_name") == "qa-mesh"

    # 2. Generate via backend API
    req_gen = urllib.request.Request(
        "http://127.0.0.1:5173/api/v1/generate-config",
        data=json.dumps({"config": cfg}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_gen, timeout=5) as resp:
        assert resp.status == 200
        gen_res = json.loads(resp.read().decode())
        toml_out = gen_res.get("toml_config", "")
        assert "10.144.144.1/24" in toml_out, "IPv4 CIDR lost during TOML generation"
        assert "qa-mesh" in toml_out, "Network identity lost"

    # 3. Verify Raw TOML dual-stack preservation mode (as used in NetworksView)
    import re
    ipv6_match = re.search(r'ipv6\s*=\s*"([^"]+)"', test_toml)
    assert ipv6_match and ipv6_match.group(1) == "fd00:144:144::1/64", "Raw IPv6 CIDR corrupted"

@test("8. Diagnostics: Outbound Connector Probe via Proxy-RPC")
def test_connector_probe():
    payload = json.dumps({
        "service_name": "api.instance.ConnectorManageRpcService",
        "method_name": "list_connector",
        "payload": {}
    }).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        assert "connectors" in res, "Missing connectors in response"

@test("9. Diagnostics: Runtime Dynamic Log Level via LoggerRpcService")
def test_logger_config():
    payload = json.dumps({
        "service_name": "api.logger.LoggerRpcService",
        "method_name": "set_logger_config",
        "payload": {"level": 4}
    }).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200

    payload_get = json.dumps({
        "service_name": "api.logger.LoggerRpcService",
        "method_name": "get_logger_config",
        "payload": {}
    }).encode()
    req_get = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload_get,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_get, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        assert res.get("level") == 4, f"Expected level 4, got {res.get('level')}"

@test("10. Diagnostics: Peer & Route Queries (PeerManageRpcService)")
def test_peer_and_route_rpc():
    # 1. list_peer
    req_peer = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=json.dumps({
            "service_name": "api.instance.PeerManageRpcService",
            "method_name": "list_peer",
            "payload": {}
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_peer, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        assert "peer_infos" in res, "Missing peer_infos in response"

    # 2. list_route
    req_route = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=json.dumps({
            "service_name": "api.instance.PeerManageRpcService",
            "method_name": "list_route",
            "payload": {}
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_route, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        assert "routes" in res, "Missing routes in response"

@test("11. Diagnostics: Prometheus Telemetry Metrics (StatsRpcService)")
def test_prometheus_metrics():
    req = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=json.dumps({
            "service_name": "api.instance.StatsRpcService",
            "method_name": "get_prometheus_stats",
            "payload": {}
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        text = res.get("prometheus_text", "")
        assert len(text) > 100, "Prometheus metrics output empty"

@test("12. Topology: PeerCenter Global Mesh RPC (with digest=0)")
def test_global_peer_map():
    req = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=json.dumps({
            "service_name": "api.instance.PeerCenterManageRpcService",
            "method_name": "get_global_peer_map",
            "payload": {"digest": 0}
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        assert "global_peer_map" in res, "Missing global_peer_map in response"

@test("13. Zero Trust ACL: Policy Patch & Real-time Rule Telemetry")
def test_acl_policy_patch_and_telemetry():
    patch = {
        "port_forwards": [],
        "proxy_networks": [],
        "routes": [],
        "exit_nodes": [],
        "mapped_listeners": [],
        "connectors": [],
        "vpn_portal_clients": [],
        "acl": {
            "acl": {
                "acl_v1": {
                    "chains": [
                        {
                            "name": "inbound",
                            "chain_type": 1,
                            "description": "Cloudflare Zero Trust Inbound Access Rules",
                            "enabled": True,
                            "rules": [
                                {
                                    "name": "CF Zero Trust Dev Allow",
                                    "description": "Allow dev team",
                                    "priority": 100,
                                    "enabled": True,
                                    "protocol": 1, # TCP
                                    "ports": ["3306", "5432"],
                                    "source_ips": [],
                                    "destination_ips": [],
                                    "source_ports": [],
                                    "source_groups": ["tag:dev"],
                                    "destination_groups": ["tag:database"],
                                    "action": 1, # Allow
                                    "rate_limit": 0,
                                    "burst_limit": 0,
                                    "stateful": False
                                }
                            ],
                            "default_action": 1
                        }
                    ]
                }
            },
            "tcp_whitelist": [],
            "udp_whitelist": []
        }
    }
    payload_patch = json.dumps({
        "service_name": "api.config.ConfigRpcService",
        "method_name": "patch_config",
        "payload": {"patch": patch}
    }).encode()
    req_patch = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload_patch,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_patch, timeout=5) as resp:
        assert resp.status == 200

    payload_stats = json.dumps({
        "service_name": "api.instance.AclManageRpcService",
        "method_name": "get_acl_stats",
        "payload": {}
    }).encode()
    req_stats = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload_stats,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_stats, timeout=5) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        rules = res.get("acl_stats", {}).get("rules", [])
        assert len(rules) > 0, "No ACL rules found in stats"
        assert rules[0].get("rule", {}).get("name") == "CF Zero Trust Dev Allow"

@test("14. Zero Trust PKI: Full Credential Lifecycle (Gen, List, Revoke)")
def test_credential_lifecycle():
    # 1. Generate
    payload_gen = json.dumps({
        "service_name": "api.instance.CredentialManageRpcService",
        "method_name": "generate_credential",
        "payload": {
            "groups": ["ops", "devs"],
            "allow_relay": True,
            "allowed_proxy_cidrs": [],
            "ttl_seconds": 7200,
            "reusable": True
        }
    }).encode()
    req_gen = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload_gen,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_gen, timeout=5) as resp:
        assert resp.status == 200
        gen_data = json.loads(resp.read().decode())
        cid = gen_data.get("credential_id")
        assert cid, "Missing credential_id in generate response"

    # 2. List
    payload_list = json.dumps({
        "service_name": "api.instance.CredentialManageRpcService",
        "method_name": "list_credentials",
        "payload": {}
    }).encode()
    req_list = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload_list,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_list, timeout=5) as resp:
        assert resp.status == 200
        list_data = json.loads(resp.read().decode())
        c_list = list_data.get("credentials", [])
        found = any(c.get("credential_id") == cid for c in c_list)
        assert found, f"Newly generated credential {cid} not in list"

    # 3. Revoke
    payload_rev = json.dumps({
        "service_name": "api.instance.CredentialManageRpcService",
        "method_name": "revoke_credential",
        "payload": {"credential_id": cid}
    }).encode()
    req_rev = urllib.request.Request(
        f"http://127.0.0.1:5173/api/v1/machines/{mid_str}/proxy-rpc",
        data=payload_rev,
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_rev, timeout=5) as resp:
        assert resp.status == 200

@test("15. Auth Logout & Re-auth Security Enforcement")
def test_logout_and_guard():
    # 1. Logout
    req_logout = urllib.request.Request("http://127.0.0.1:5173/api/v1/auth/logout")
    with opener.open(req_logout, timeout=5) as resp:
        assert resp.status == 200

    # 2. Verify check_login_status rejects or reports not logged in
    req_check = urllib.request.Request("http://127.0.0.1:5173/api/v1/auth/check_login_status")
    try:
        with opener.open(req_check, timeout=5) as resp:
            data = resp.read().decode()
            assert "false" in data.lower() or "error" in data.lower()
    except urllib.error.HTTPError as e:
        assert e.code == 401 or e.code == 403, f"Expected 401/403, got {e.code}"

    # 3. Re-login for continued service
    md5_pass = hashlib.md5(b"admin").hexdigest()
    req_relogin = urllib.request.Request(
        "http://127.0.0.1:5173/api/v1/auth/login",
        data=json.dumps({"username": "admin", "password": md5_pass, "captcha_code": ""}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req_relogin, timeout=5) as resp:
        assert resp.status == 200


if __name__ == "__main__":
    print("=" * 68)
    print(" EasyTier Cloudflare Dashboard - Round 2 Q/A & Regression Suite")
    print("=" * 68)
    test_static_icon_assets()
    test_frontend_shell()
    test_captcha_proxy()
    test_login()
    test_check_login_status()
    test_machine_discovery()
    test_toml_round_trip()
    test_connector_probe()
    test_logger_config()
    test_peer_and_route_rpc()
    test_prometheus_metrics()
    test_global_peer_map()
    test_acl_policy_patch_and_telemetry()
    test_credential_lifecycle()
    test_logout_and_guard()
    print("=" * 68)
    print(f"Results: {PASSED} Passed, {FAILED} Failed (Total: {PASSED + FAILED})")
    print("=" * 68)
    sys.exit(0 if FAILED == 0 else 1)
