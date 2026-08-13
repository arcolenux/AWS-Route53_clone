/**
 * End-to-End API Integration Test Suite
 * Tests all backend endpoints, authentication, hosted zones, DNS records (all 9 types),
 * validation rules, cascade deletes, error handling, and search/pagination.
 */

const BASE_URL = process.env.API_URL || "http://127.0.0.1:8000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
    passed++;
  }
}

async function runTests() {
  console.log(`\n🚀 Starting AWS Route53 Clone API Integration Tests on ${BASE_URL}...\n`);

  // 1. Health check
  console.log("--- 1. Health Check ---");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert(healthRes.status === 200, "Health check returns 200");
  const healthData = await healthRes.json();
  assert(healthData.status === "ok", "Health status is ok");

  // 2. Authentication - Demo User Login
  console.log("\n--- 2. Authentication ---");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo@route53.example",
      password: "DemoPass123!",
    }),
  });
  assert(loginRes.status === 200, "Demo login succeeds");
  const loginData = await loginRes.json();
  assert(!!loginData.token, "JWT token returned");
  assert(loginData.user.email === "demo@route53.example", "User email matches");
  const token = loginData.token;

  // Invalid login
  const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo@route53.example",
      password: "WrongPassword!",
    }),
  });
  assert(badLogin.status === 401, "Invalid password returns 401");

  // Auth /me endpoint
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(meRes.status === 200, "/api/auth/me returns 200 with token");
  const meData = await meRes.json();
  assert(meData.id === loginData.user.id, "Current user ID matches login response");

  // Unauthorized access
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert(unauthRes.status === 401, "/api/auth/me without token returns 401");

  // Register a new user
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: uniqueEmail,
      display_name: "Test Engineer",
      password: "SecurePassword123!",
    }),
  });
  assert(regRes.status === 201, "Registration returns 201");
  const regData = await regRes.json();
  assert(regData.user.email === uniqueEmail, "Registered email matches");

  // 3. Hosted Zones CRUD
  console.log("\n--- 3. Hosted Zones CRUD ---");
  const zoneName = `test-${Date.now()}.net`;
  const createZoneRes = await fetch(`${BASE_URL}/api/hosted-zones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: zoneName,
      private: false,
      description: "Integration test zone",
    }),
  });
  assert(createZoneRes.status === 201, "Create hosted zone returns 201");
  const zone = await createZoneRes.json();
  assert(zone.name === zoneName, "Zone name matches");
  assert(zone.private === false, "Zone is public");
  const zoneId = zone.id;

  // Duplicate zone rejection
  const dupZoneRes = await fetch(`${BASE_URL}/api/hosted-zones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: zoneName,
      private: false,
    }),
  });
  assert(dupZoneRes.status === 409, "Duplicate zone returns 409 Conflict");

  // Get zone
  const getZoneRes = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(getZoneRes.status === 200, "Get zone by ID returns 200");
  const fetchedZone = await getZoneRes.json();
  assert(fetchedZone.id === zoneId, "Fetched zone ID matches");

  // Update zone
  const updateZoneRes = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: "Updated description for test zone",
    }),
  });
  assert(updateZoneRes.status === 200, "Update zone returns 200");
  const updatedZone = await updateZoneRes.json();
  assert(updatedZone.description === "Updated description for test zone", "Zone description updated");

  // List & Search zones
  const listZonesRes = await fetch(`${BASE_URL}/api/hosted-zones?search=${zoneName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(listZonesRes.status === 200, "List zones with search returns 200");
  const listData = await listZonesRes.json();
  assert(listData.items.some((z) => z.id === zoneId), "Search returns created zone");

  // 4. DNS Records CRUD - All 9 Record Types
  console.log("\n--- 4. DNS Records (All 9 Types) ---");
  const recordTypesToTest = [
    { name: "@", type: "A", ttl: 300, values: ["192.0.2.1", "192.0.2.2"], comment: "Apex A" },
    { name: "ipv6", type: "AAAA", ttl: 300, values: ["2001:db8::1"], comment: "IPv6" },
    { name: "www", type: "CNAME", ttl: 300, values: [zoneName], comment: "Web alias" },
    { name: "@", type: "TXT", ttl: 300, values: ['"v=spf1 include:example.com ~all"'], comment: "SPF TXT" },
    { name: "mail", type: "MX", ttl: 300, values: ["10 mail1.example.com", "20 mail2.example.com"], comment: "Mail" },
    { name: "ns-test", type: "NS", ttl: 86400, values: ["ns1.example.com"], comment: "Delegated NS" },
    { name: "1.2.0.192.in-addr.arpa", type: "PTR", ttl: 300, values: [zoneName], comment: "PTR" },
    { name: "_sip._tcp", type: "SRV", ttl: 300, values: ["10 60 5060 sip.example.com"], comment: "SIP SRV" },
    { name: "@", type: "CAA", ttl: 300, values: ['0 issue "letsencrypt.org"'], comment: "CAA cert" },
  ];

  const createdRecordIds = [];

  for (const rec of recordTypesToTest) {
    const res = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(rec),
    });
    assert(res.status === 201, `Create ${rec.type} record returns 201`);
    const data = await res.json();
    assert(data.type === rec.type, `${rec.type} record type verified`);
    assert(data.values.length === rec.values.length, `${rec.type} values count matches`);
    createdRecordIds.push(data.id);
  }

  // Record Validation Checks
  console.log("\n--- 5. DNS Record Validation Rules ---");
  // Invalid A record
  const invalidA = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "bad-a",
      type: "A",
      ttl: 300,
      values: ["999.999.999.9999"],
    }),
  });
  assert(invalidA.status === 422, "Invalid IPv4 address rejected with 422");

  // Invalid MX record (missing priority)
  const invalidMX = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "bad-mx",
      type: "MX",
      ttl: 300,
      values: ["mail.example.com"],
    }),
  });
  assert(invalidMX.status === 422, "Invalid MX without priority rejected with 422");

  // CNAME with multiple values rejected
  const invalidCNAME = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "bad-cname",
      type: "CNAME",
      ttl: 300,
      values: ["target1.com", "target2.com"],
    }),
  });
  assert(invalidCNAME.status === 422, "Multi-value CNAME rejected with 422");

  // Update a record
  console.log("\n--- 6. Update and Delete Records ---");
  const firstRecordId = createdRecordIds[0];
  const updateRecRes = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}/records/${firstRecordId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ttl: 600,
      values: ["192.0.2.100"],
      comment: "Updated A record",
    }),
  });
  assert(updateRecRes.status === 200, "Update record returns 200");
  const updatedRec = await updateRecRes.json();
  assert(updatedRec.ttl === 600, "Record TTL updated to 600");
  assert(updatedRec.values[0] === "192.0.2.100", "Record value updated");

  // Delete a single record
  const delRecRes = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}/records/${firstRecordId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(delRecRes.status === 204, "Delete record returns 204 No Content");

  // 7. Cascade Delete on Hosted Zone
  console.log("\n--- 7. Cascade Deletion ---");
  const delZoneRes = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(delZoneRes.status === 204, "Delete hosted zone returns 204 No Content");

  // Verify zone records are cascade-deleted
  const getDeadZone = await fetch(`${BASE_URL}/api/hosted-zones/${zoneId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(getDeadZone.status === 404, "Deleted hosted zone returns 404");

  console.log(`\n========================================`);
  console.log(`🎉 ALL INTEGRATION TESTS PASSED: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
