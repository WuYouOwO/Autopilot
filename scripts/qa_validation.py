#!/usr/bin/env python3
"""
EasyTier Next-Gen Frontend & Backend Integration Q/A Test Suite
Tests all 9 end-to-end capabilities against the live system.
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

@test("1. Frontend Server & Cloudflare Theme Delivery")
def test_frontend_server():
    req = urllib.request.Request("http://127.0.0.1:5173/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        body = resp.read().decode()
        assert "EasyTier" in body or "html" in body.lower(), "HTML shell not served properly"

@test("2. Vite Reverse Proxy -> Captcha Endpoint")
def test_captcha_proxy():
    req = urllib.request.Request("http://127.0.0.1:5173/api/v1/auth/captcha")
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200
        content_type = resp.headers.get("Content-Type", "")
        assert "image/png" in content_type, f"Expected image/png, got {content_type}"
        data = resp.read()
        assert len(data) > 100, "Captcha image is empty"

@test("3. MD5 Pre-hash Auth & Session Creation")
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

@test("4. Auth Session Verification (/auth/check_login_status)")
def test_check_login_status():
    req = urllib.request.Request("http://127.0.0.1:5173/api/v1/auth/check_login_status")
    with opener.open(req, timeout=5) as resp:
        assert resp.status == 200

@test("5. Machine Discovery & 128-bit Proto UUID Parsing")
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

@test("6. Diagnostics: Outbound Connector Probe via Proxy-RPC")
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

@test("7. Diagnostics: Runtime Dynamic Log Level via LoggerRpcService")
def test_logger_config():
    # Set to DEBUG (4)
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

    # Get level and verify it is 4
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

@test("8. Zero Trust ACL: Policy Patch & Real-time Rule Telemetry")
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

    # Query AclManageRpcService get_acl_stats
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

@test("9. Zero Trust PKI: Full Credential Lifecycle (Gen, List, Revoke)")
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


if __name__ == "__main__":
    print("=" * 60)
    print(" EasyTier Cloudflare Dashboard End-to-End Q/A Test Suite")
    print("=" * 60)
    test_frontend_server()
    test_captcha_proxy()
    test_login()
    test_check_login_status()
    test_machine_discovery()
    test_connector_probe()
    test_logger_config()
    test_acl_policy_patch_and_telemetry()
    test_credential_lifecycle()
    print("=" * 60)
    print(f"Results: {PASSED} Passed, {FAILED} Failed (Total: {PASSED + FAILED})")
    print("=" * 60)
    sys.exit(0 if FAILED == 0 else 1)
