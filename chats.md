# Chats API Documentation

## Overview

The Chats API enables real-time messaging between customers and freelancers within the context of accepted bookings. All chat operations require authentication and are scoped to the authenticated user's role (customer or freelancer).

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Create Chat Message

Creates a new chat message within a booking conversation.

**Endpoint:**
```
POST /users/me/bookings/:booking_id/chats
```

**Authentication:** Required (Customer or Freelancer)

**URI Parameters:**

| Parameter    | Type   | Required | Description                     |
|--------------|--------|----------|---------------------------------|
| `booking_id` | int64  | Yes      | ID of the booking (min: 1)      |

**Request Body:**

```json
{
  "message_text": "string",
  "receiver_user_id": 123
}
```

| Field              | Type   | Required | Validation       | Description                          |
|--------------------|--------|----------|------------------|--------------------------------------|
| `message_text`     | string | Yes      | Non-empty        | The message content                  |
| `receiver_user_id` | int64  | Yes      | min: 1           | User ID of the message recipient     |

**Success Response:**

```json
{
  "chat": {
    "id": 1,
    "booking_id": 100,
    "sender_user_id": 10,
    "receiver_user_id": 20,
    "kind": "text",
    "message_text": "Hello, I have a question about the booking.",
    "role_of_sender": "customer",
    "seen_by_receiver": false,
    "metadata": null,
    "created_at": "2025-12-03T10:30:00Z"
  }
}
```

**Error Responses:**

| Status | Description                                                        |
|--------|--------------------------------------------------------------------|
| 400    | Invalid request body or URI parameters                             |
| 401    | Unauthorized - Missing or invalid token                            |
| 403    | Forbidden - User role is neither customer nor freelancer           |
| 500    | Internal server error (includes: booking not accepted, invalid sender/receiver pair) |

**Business Rules:**

- The booking must have status `accepted`
- Valid sender/receiver combinations:
  - Customer sends to Freelancer (freelancer's user_id)
  - Freelancer sends to Customer (customer's user_id)
- The sender is automatically set to the authenticated user
- `role_of_sender` is automatically set based on the authenticated user's role

---

### 2. Get Customer Chat Contacts

Retrieves a list of distinct freelancers the customer has chatted with (sidebar contacts).

**Endpoint:**
```
GET /users/me/chats/contacts
```

**Authentication:** Required (Customer only)

**Request Body:** None

**Success Response:**

```json
{
  "contacts": [
    {
      "user_id": 20,
      "full_name": "John Freelancer",
      "avatar_url": "https://example.com/avatar.jpg",
      "last_message": "Thanks for booking!",
      "last_message_at": "2025-12-03T10:30:00Z",
      "can_send_message": true,
      "unread_count": 3
    }
  ]
}
```

**Response Fields:**

| Field              | Type      | Description                                                     |
|--------------------|-----------|-----------------------------------------------------------------|
| `user_id`          | int64     | Freelancer's user ID                                            |
| `full_name`        | string    | Freelancer's display name                                       |
| `avatar_url`       | string    | URL to freelancer's avatar image                                |
| `last_message`     | string    | Most recent message text in the conversation                    |
| `last_message_at`  | timestamp | Timestamp of the last message                                   |
| `can_send_message` | boolean   | `true` if there's an active accepted booking with this freelancer |
| `unread_count`     | int64     | Number of unread messages from this freelancer                  |

**Error Responses:**

| Status | Description                                   |
|--------|-----------------------------------------------|
| 401    | Unauthorized - Missing or invalid token       |
| 403    | Forbidden - User is not a customer            |
| 500    | Internal server error                         |

---

### 3. Get Freelancer Chat Contacts

Retrieves a list of distinct customers the freelancer has chatted with (sidebar contacts).

**Endpoint:**
```
GET /users/me/freelancer/chats/contacts
```

**Authentication:** Required (Freelancer only)

**Request Body:** None

**Success Response:**

```json
{
  "contacts": [
    {
      "user_id": 10,
      "full_name": "Jane Customer",
      "avatar_url": "https://example.com/avatar.jpg",
      "last_message": "When can you start?",
      "last_message_at": "2025-12-03T10:30:00Z",
      "can_send_message": true,
      "unread_count": 1
    }
  ]
}
```

**Response Fields:**

| Field              | Type      | Description                                                   |
|--------------------|-----------|---------------------------------------------------------------|
| `user_id`          | int64     | Customer's user ID                                            |
| `full_name`        | string    | Customer's display name                                       |
| `avatar_url`       | string    | URL to customer's avatar image                                |
| `last_message`     | string    | Most recent message text in the conversation                  |
| `last_message_at`  | timestamp | Timestamp of the last message                                 |
| `can_send_message` | boolean   | `true` if there's an active accepted booking with this customer |
| `unread_count`     | int64     | Number of unread messages from this customer                  |

**Error Responses:**

| Status | Description                                   |
|--------|-----------------------------------------------|
| 401    | Unauthorized - Missing or invalid token       |
| 403    | Forbidden - User is not a freelancer          |
| 500    | Internal server error                         |

---

### 4. Get Customer Chats with Freelancer

Retrieves all chat messages between the authenticated customer and a specific freelancer. Also marks all received messages as seen.

**Endpoint:**
```
GET /users/me/chats/contacts/:user_id
```

**Authentication:** Required (Customer only)

**URI Parameters:**

| Parameter | Type  | Required | Description                      |
|-----------|-------|----------|----------------------------------|
| `user_id` | int64 | Yes      | Freelancer's user ID             |

**Request Body:** None

**Success Response:**

```json
{
  "chats": [
    {
      "id": 1,
      "booking_id": 100,
      "sender_user_id": 10,
      "receiver_user_id": 20,
      "kind": "text",
      "message_text": "Hello!",
      "role_of_sender": "customer",
      "seen_by_receiver": true,
      "metadata": null,
      "created_at": "2025-12-03T10:00:00Z",
      "booking_status": "accepted",
      "slot_date": "2025-12-10",
      "service_title": "Haircut",
      "can_send_message": true
    },
    {
      "id": 2,
      "booking_id": 100,
      "sender_user_id": null,
      "receiver_user_id": null,
      "kind": "system",
      "message_text": "Booking accepted",
      "role_of_sender": "system",
      "seen_by_receiver": false,
      "metadata": null,
      "created_at": "2025-12-03T10:05:00Z",
      "booking_status": "accepted",
      "slot_date": "2025-12-10",
      "service_title": "Haircut",
      "can_send_message": true
    },
    {
      "id": 3,
      "booking_id": 100,
      "sender_user_id": 20,
      "receiver_user_id": 10,
      "kind": "price_proposal",
      "message_text": "I'd like to propose a new price",
      "role_of_sender": "freelancer",
      "seen_by_receiver": true,
      "metadata": null,
      "created_at": "2025-12-03T10:10:00Z",
      "booking_status": "accepted",
      "slot_date": "2025-12-10",
      "service_title": "Haircut",
      "can_send_message": true,
      "price_offer_id": 1,
      "price_offer_amount": "50.00",
      "price_offer_currency": "BHD",
      "price_offer_status": "proposed",
      "price_offer_responded_by": null,
      "price_offer_responded_at": null,
      "price_offer_note": null
    }
  ]
}
```

**Response Fields:**

| Field              | Type      | Description                                            |
|--------------------|-----------|--------------------------------------------------------|
| `id`               | int64     | Chat message ID                                        |
| `booking_id`       | int64     | Associated booking ID                                  |
| `sender_user_id`   | int64     | User ID of the message sender (null for system messages) |
| `receiver_user_id` | int64     | User ID of the message receiver (null for system messages) |
| `kind`             | string    | Message type: `text`, `system`, or `price_proposal`    |
| `message_text`     | string    | Message content                                        |
| `role_of_sender`   | string    | Role of sender: `customer`, `freelancer`, or `system`  |
| `seen_by_receiver` | boolean   | Whether the receiver has seen the message              |
| `metadata`         | object    | Additional message metadata (nullable)                 |
| `created_at`       | timestamp | Message creation timestamp                             |
| `booking_status`   | string    | Current booking status                                 |
| `slot_date`        | date      | Scheduled date of the booking                          |
| `service_title`    | string    | Title of the booked service                            |
| `can_send_message` | boolean   | `true` if booking is accepted (messaging allowed)      |

**Price Offer Fields (only present when `kind` is `price_proposal`):**

| Field                      | Type      | Description                                         |
|----------------------------|-----------|-----------------------------------------------------|
| `price_offer_id`           | int64     | ID of the price offer                               |
| `price_offer_amount`       | string    | Proposed price amount (decimal as string)           |
| `price_offer_currency`     | string    | Currency code (e.g., `BHD`)                         |
| `price_offer_status`       | string    | Status: `proposed`, `accepted`, `rejected`, `withdrawn`, `expired` |
| `price_offer_responded_by` | int64     | User ID who responded to the offer (nullable)       |
| `price_offer_responded_at` | timestamp | When the offer was responded to (nullable)          |
| `price_offer_note`         | string    | Additional note on the response (nullable)          |

**Side Effects:**

- All unread messages where the customer is the receiver are marked as `seen_by_receiver = true`

**Error Responses:**

| Status | Description                                   |
|--------|-----------------------------------------------|
| 400    | Invalid user_id parameter                     |
| 401    | Unauthorized - Missing or invalid token       |
| 403    | Forbidden - User is not a customer            |
| 500    | Internal server error                         |

**Notes:**

- Messages are ordered by `booking_id DESC`, then `created_at ASC`
- Group messages by `booking_id` on the client side to display conversations per booking

---

### 5. Get Freelancer Chats with Customer

Retrieves all chat messages between the authenticated freelancer and a specific customer. Also marks all received messages as seen.

**Endpoint:**
```
GET /users/me/freelancer/chats/contacts/:user_id
```

**Authentication:** Required (Freelancer only)

**URI Parameters:**

| Parameter | Type  | Required | Description                      |
|-----------|-------|----------|----------------------------------|
| `user_id` | int64 | Yes      | Customer's user ID               |

**Request Body:** None

**Success Response:**

```json
{
  "chats": [
    {
      "id": 1,
      "booking_id": 100,
      "sender_user_id": 10,
      "receiver_user_id": 20,
      "kind": "text",
      "message_text": "Hello!",
      "role_of_sender": "customer",
      "seen_by_receiver": true,
      "metadata": null,
      "created_at": "2025-12-03T10:00:00Z",
      "booking_status": "accepted",
      "slot_date": "2025-12-10",
      "service_title": "Haircut",
      "can_send_message": true
    },
    {
      "id": 2,
      "booking_id": 100,
      "sender_user_id": 10,
      "receiver_user_id": 20,
      "kind": "price_proposal",
      "message_text": "Here's my price offer",
      "role_of_sender": "customer",
      "seen_by_receiver": true,
      "metadata": null,
      "created_at": "2025-12-03T10:05:00Z",
      "booking_status": "accepted",
      "slot_date": "2025-12-10",
      "service_title": "Haircut",
      "can_send_message": true,
      "price_offer_id": 2,
      "price_offer_amount": "75.00",
      "price_offer_currency": "BHD",
      "price_offer_status": "accepted",
      "price_offer_responded_by": 20,
      "price_offer_responded_at": "2025-12-03T10:10:00Z",
      "price_offer_note": "Sounds good!"
    }
  ]
}
```

**Response Fields:**

Same as [Get Customer Chats with Freelancer](#4-get-customer-chats-with-freelancer)

**Side Effects:**

- All unread messages where the freelancer is the receiver are marked as `seen_by_receiver = true`

**Error Responses:**

| Status | Description                                   |
|--------|-----------------------------------------------|
| 400    | Invalid user_id parameter                     |
| 401    | Unauthorized - Missing or invalid token       |
| 403    | Forbidden - User is not a freelancer          |
| 500    | Internal server error                         |

**Notes:**

- Messages are ordered by `booking_id DESC`, then `created_at ASC`
- Group messages by `booking_id` on the client side to display conversations per booking

---

## Data Types

### Chat Kind

| Value            | Description                                      |
|------------------|--------------------------------------------------|
| `text`           | Regular text message                             |
| `system`         | System-generated message (e.g., booking updates) |
| `price_proposal` | Price proposal message with attached offer       |

### Role of Sender

| Value        | Description                         |
|--------------|-------------------------------------|
| `customer`   | Message sent by customer            |
| `freelancer` | Message sent by freelancer          |
| `system`     | Message generated by the system     |

### Price Offer Status

| Value       | Description                              |
|-------------|------------------------------------------|
| `proposed`  | Offer is pending response                |
| `accepted`  | Offer was accepted                       |
| `rejected`  | Offer was rejected                       |
| `withdrawn` | Offer was withdrawn by proposer          |
| `expired`   | Offer expired without response           |

### Booking Status

| Value      | Description                           |
|------------|---------------------------------------|
| `pending`  | Booking awaiting acceptance           |
| `accepted` | Booking accepted, messaging enabled   |
| `rejected` | Booking rejected                      |
| `cancelled`| Booking cancelled                     |
| `completed`| Booking completed                     |

---

## Business Rules Summary

1. **Messaging Requires Accepted Booking**: Users can only send messages when there is at least one booking with `status = 'accepted'` between them.

2. **Role-Based Access**:
   - Customer endpoints require `role = "customer"`
   - Freelancer endpoints require `role = "freelancer"`

3. **Automatic Read Receipts**: When fetching conversation details, all unread messages addressed to the authenticated user are automatically marked as seen.

4. **Sender/Receiver Validation**: The API validates that the sender and receiver are valid participants of the booking (customer ↔ freelancer relationship).

5. **Contact Availability**: The `can_send_message` field indicates whether new messages can be sent based on active booking status.

---

## Error Format

All error responses follow this format:

```json
{
  "error": "error message description"
}
```

