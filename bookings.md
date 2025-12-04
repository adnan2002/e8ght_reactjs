# Bookings API Documentation

## Overview

The Bookings API allows customers and freelancers to view their bookings. Customers can view all their bookings with various freelancers, while freelancers can view all bookings made for their services. All endpoints require authentication and are scoped to the authenticated user's role.

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Get Customer Bookings

Retrieves all bookings made by the authenticated customer.

**Endpoint:**
```
GET /api/v1/users/me/bookings
```

**Authentication:** Required (Customer only)

**Request Body:** None

**Success Response:**

```json
{
  "bookings": [
    {
      "id": 1,
      "customer_id": 10,
      "freelancer_id": 5,
      "service_id": 3,
      "timeslot_id": 25,
      "note": "Please bring your own equipment",
      "final_price": "150.00",
      "currency": "USD",
      "status": "accepted",
      "expires_at": "2025-12-05T10:00:00Z",
      "slot_date": "2025-12-10",
      "start_time": "09:00",
      "end_time": "10:00",
      "rejected_reason": "",
      "freelancer_seen": true,
      "created_at": "2025-12-03T10:30:00Z",
      "updated_at": "2025-12-03T11:00:00Z",
      "freelancer_full_name": "John Smith",
      "freelancer_avatar_url": "https://example.com/avatar.jpg",
      "service_title": "Haircut & Styling"
    }
  ]
}
```

**Response Fields:**

| Field                   | Type      | Description                                          |
|-------------------------|-----------|------------------------------------------------------|
| `id`                    | int64     | Unique booking identifier                            |
| `customer_id`           | int64     | ID of the customer who made the booking              |
| `freelancer_id`         | int64     | ID of the freelancer providing the service           |
| `service_id`            | int64     | ID of the booked service                             |
| `timeslot_id`           | int64     | ID of the reserved timeslot                          |
| `note`                  | string    | Customer's note or special requests                  |
| `final_price`           | string    | Final price for the booking (decimal as string)      |
| `currency`              | string    | Currency code (e.g., USD, EUR)                       |
| `status`                | string    | Current booking status                               |
| `expires_at`            | timestamp | When the booking request expires (for pending)       |
| `slot_date`             | date      | Date of the appointment (YYYY-MM-DD)                 |
| `start_time`            | string    | Start time of the appointment (HH:MM)                |
| `end_time`              | string    | End time of the appointment (HH:MM)                  |
| `rejected_reason`       | string    | Reason for rejection (if status is rejected)         |
| `freelancer_seen`       | boolean   | Whether the freelancer has seen the booking          |
| `created_at`            | timestamp | When the booking was created                         |
| `updated_at`            | timestamp | When the booking was last updated                    |
| `freelancer_full_name`  | string    | Full name of the freelancer                          |
| `freelancer_avatar_url` | string    | URL to the freelancer's avatar image                 |
| `service_title`         | string    | Title of the booked service                          |

**Error Responses:**

| Status | Description                                   |
|--------|-----------------------------------------------|
| 401    | Unauthorized - Missing or invalid token       |
| 403    | Forbidden - User is not a customer            |
| 500    | Internal server error                         |

---

### 2. Get Freelancer Bookings

Retrieves all bookings for the authenticated freelancer's services.

**Endpoint:**
```
GET /api/v1/users/me/freelancer/bookings
```

**Authentication:** Required (Freelancer only)

**Request Body:** None

**Success Response:**

```json
{
  "bookings": [
    {
      "id": 1,
      "slot_date": "2025-12-10",
      "start_time": "09:00",
      "end_time": "10:00",
      "customer_full_name": "Jane Doe",
      "customer_avatar_url": "https://example.com/customer-avatar.jpg",
      "service_title": "Haircut & Styling",
      "status": "pending",
      "expires_at": "2025-12-05T10:00:00Z",
      "created_at": "2025-12-03T10:30:00Z",
      "updated_at": "2025-12-03T10:30:00Z",
      "rejected_reason": "",
      "freelancer_seen": false
    }
  ]
}
```

**Response Fields:**

| Field                 | Type      | Description                                          |
|-----------------------|-----------|------------------------------------------------------|
| `id`                  | int64     | Unique booking identifier                            |
| `slot_date`           | date      | Date of the appointment (YYYY-MM-DD)                 |
| `start_time`          | string    | Start time of the appointment (HH:MM)                |
| `end_time`            | string    | End time of the appointment (HH:MM)                  |
| `customer_full_name`  | string    | Full name of the customer                            |
| `customer_avatar_url` | string    | URL to the customer's avatar image                   |
| `service_title`       | string    | Title of the booked service                          |
| `status`              | string    | Current booking status                               |
| `expires_at`          | timestamp | When the booking request expires (for pending)       |
| `created_at`          | timestamp | When the booking was created                         |
| `updated_at`          | timestamp | When the booking was last updated                    |
| `rejected_reason`     | string    | Reason for rejection (if status is rejected)         |
| `freelancer_seen`     | boolean   | Whether the freelancer has seen the booking          |

**Error Responses:**

| Status | Description                                   |
|--------|-----------------------------------------------|
| 401    | Unauthorized - Missing or invalid token       |
| 403    | Forbidden - User is not a freelancer          |
| 500    | Internal server error                         |

---

## Data Types

### Booking Status

| Value       | Description                                                      |
|-------------|------------------------------------------------------------------|
| `pending`   | Booking is awaiting freelancer's acceptance                      |
| `accepted`  | Booking has been accepted by the freelancer                      |
| `rejected`  | Booking has been rejected by the freelancer                      |
| `cancelled` | Booking has been cancelled                                       |
| `expired`   | Booking request expired before freelancer responded              |
| `completed` | Booking appointment has been completed                           |

---

## Business Rules Summary

1. **Role-Based Access**:
   - Customer bookings endpoint requires `role = "customer"`
   - Freelancer bookings endpoint requires `role = "freelancer"`

2. **Booking Expiration**: Pending bookings have an `expires_at` timestamp. If the freelancer doesn't respond before this time, the booking automatically expires.

3. **Data Visibility**:
   - Customers see freelancer details (name, avatar) and comprehensive booking information
   - Freelancers see customer details (name, avatar) and appointment-focused information

4. **Time Formatting**: 
   - `slot_date` is formatted as `YYYY-MM-DD`
   - `start_time` and `end_time` are formatted as `HH:MM` (24-hour format)
   - Timestamps (`created_at`, `updated_at`, `expires_at`) are in ISO 8601 format with timezone

---

## Error Format

All error responses follow this format:

```json
{
  "error": "error message description"
}
```

