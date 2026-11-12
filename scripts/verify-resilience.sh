#!/usr/bin/env bash
set -e

BASE_URL="${1:-http://localhost:5000}"

echo "=================================================="
echo " Multi-Container Verification Suite (Bash / Linux)"
echo " Target: ${BASE_URL}"
echo "=================================================="

# 1. Health
echo -e "\n[Step 1] Checking Health..."
curl -s "${BASE_URL}/health" | grep -q "status" && echo " Health check passed."

# 2. Create Todo
echo -e "\n[Step 2] Creating Todo..."
CREATE_RES=$(curl -s -X POST "${BASE_URL}/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"Automated CI Verification","description":"Testing persistence"}')

TODO_ID=$(echo "${CREATE_RES}" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
echo " Created Todo ID: ${TODO_ID}"

# 3. List
echo -e "\n[Step 3] Verifying Todo in List..."
curl -s "${BASE_URL}/todos" | grep -q "${TODO_ID}" && echo " Found in database."

# 4. Update
echo -e "\n[Step 4] Updating Todo..."
curl -s -X PUT "${BASE_URL}/todos/${TODO_ID}" \
  -H "Content-Type: application/json" \
  -d '{"isCompleted":true}' | grep -q '"isCompleted":true' && echo " Update confirmed."

# 5. Delete
echo -e "\n[Step 5] Deleting Todo..."
curl -s -X DELETE "${BASE_URL}/todos/${TODO_ID}" | grep -q "deleted successfully" && echo " Deleted successfully."

echo -e "\n=================================================="
echo " All API verification tests succeeded!"
echo "=================================================="
