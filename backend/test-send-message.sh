#!/bin/bash

# Test script to send a WhatsApp message
# Usage: ./test-send-message.sh "+1234567890" "Hello from your chatbot!"

PHONE_NUMBER="$1"
MESSAGE="$2"
API_URL="http://localhost:3001/api/messages/send"

if [ -z "$PHONE_NUMBER" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <phone_number> <message>"
    echo "Example: $0 '+1234567890' 'Hello from your chatbot!'"
    exit 1
fi

echo "🚀 Sending message to $PHONE_NUMBER: $MESSAGE"
echo "📡 API URL: $API_URL"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$PHONE_NUMBER\",
    \"message\": \"$MESSAGE\"
  }" | jq .

echo ""
echo "✅ Message sent! Check your WhatsApp and the dashboard."