#!/bin/bash

API_URL="http://localhost:5000/api/v1/users/me/addresses"
TOKEN="v2.local.VpzrYPX3T05Paz-kDTneBvyoOdiYE1FMIqKxpJSBa9Ccfl7Q2YIVBV1CoYukxAtaUej6d4CULjUnH8CSmE_UACkktdUf7hQnuuMvxZSZyJcXV7_Dhcq1IzuB4tTP3Rp7ETpk3X0pE40qyebasqzUDRSlcKIC4MaasCiQmc76x5D5wrRtNmVAqaD_FE134yhPkb79qjThf6F9fgMTaVh666kznENKTYI5DIMnW2mJotmLFYEHjDH5Tt0u17Z8JU7amzJiFc4jStBt_41Cww9CPG3QlXlsP44KNbH1LBJuY0vVa0ezzZ81Cfy814-tyxZyFtZS0Ok.bnVsbA"

for i in $(seq 1 30); do
  echo "Creating address #$i..."

  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"address_label\": \"Address $i\",
      \"address_type\": \"house\",
      \"address_line_1\": \"Street $i\",
      \"address_line_2\": \"Building $i\",
      \"town\": \"Town $i\",
      \"governorate\": \"Governorate $i\",
      \"country\": \"Bahrain\",
      \"road_number\": \"$((100 + i))\",
      \"latitude\": 26.2$i,
      \"longitude\": 50.5$i,
      \"additional_directions\": \"Near place $i\"
    }"

  echo ""
  sleep 0.1  # 100ms delay
done
