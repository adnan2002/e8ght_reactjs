# List Public Freelancers API

List all public freelancers with optional full-text search and flexible filtering.

## Endpoint

```
GET /v1/freelancers
```

## Query Parameters

### Pagination (Required)

| Parameter   | Type    | Required | Description                                      |
|-------------|---------|----------|--------------------------------------------------|
| `page_id`   | integer | Yes      | Page number (minimum: 1)                         |
| `page_size` | integer | Yes      | Number of results per page (minimum: 5, max: 10) |

### Search (Optional)

| Parameter | Type   | Required | Description                       |
|-----------|--------|----------|-----------------------------------|
| `q`       | string | No       | Search query for full-text search |

### Filters (Optional)

| Parameter           | Type     | Description                                                      |
|---------------------|----------|------------------------------------------------------------------|
| `min_age`           | integer  | Minimum age of freelancer (18-100)                               |
| `max_age`           | integer  | Maximum age of freelancer (18-100)                               |
| `gender`            | string   | Filter by gender: `male` or `female`                             |
| `service_categories`| integer[]| Filter by service category IDs (can specify multiple)            |
| `pricing_type`      | string   | Filter by pricing type: `fixed` or `range`                       |
| `min_price`         | number   | Minimum price (filters services with price >= this value)        |
| `max_price`         | number   | Maximum price (filters services with price <= this value)        |
| `governorate`       | string   | Filter by governorate (partial match, case-insensitive)          |
| `town`              | string   | Filter by town (partial match, case-insensitive)                 |
| `service_location`  | string   | Filter by service location: `on_premise`, `door_step`, or `both` |
| `min_experience`    | integer  | Minimum years of experience                                      |
| `max_experience`    | integer  | Maximum years of experience                                      |
| `is_accepting_orders`| boolean | Filter by order acceptance status: `true` or `false`            |

## Behavior

- **Without filters**: Returns all public freelancers ordered by experience, then creation date
- **With `q` parameter**: Performs full-text search across freelancer bio, certifications, service titles, descriptions, products used, and service category names. Results are ordered by relevance rank.
- **With filters**: Applies all specified filters. Filters can be combined freely.
- **Price filtering**: Works with both `fixed` and `range` pricing types. For fixed pricing, checks `fixed_price`. For range pricing, checks `min_price`/`max_price`.
- **Service location filtering**: When filtering for `on_premise` or `door_step`, also matches freelancers with `both` location type.

## Request Examples

### List all freelancers (paginated)

```
GET /v1/freelancers?page_id=1&page_size=10
```

### Search freelancers

```
GET /v1/freelancers?page_id=1&page_size=10&q=hair styling
```

### Filter by age and gender

```
GET /v1/freelancers?page_id=1&page_size=10&min_age=25&max_age=40&gender=female
```

### Filter by service categories

```
GET /v1/freelancers?page_id=1&page_size=10&service_categories=1&service_categories=3
```

### Filter by price range

```
GET /v1/freelancers?page_id=1&page_size=10&min_price=50&max_price=200
```

### Filter by location

```
GET /v1/freelancers?page_id=1&page_size=10&governorate=Capital&town=Manama
```

### Filter by service location type

```
GET /v1/freelancers?page_id=1&page_size=10&service_location=door_step
```

### Filter by experience

```
GET /v1/freelancers?page_id=1&page_size=10&min_experience=5&max_experience=15
```

### Filter only accepting orders

```
GET /v1/freelancers?page_id=1&page_size=10&is_accepting_orders=true
```

### Combined filters with search

```
GET /v1/freelancers?page_id=1&page_size=10&q=photographer&governorate=Capital&pricing_type=fixed&max_price=150&is_accepting_orders=true
```

## Response

### Success (200 OK)

```json
{
  "freelancers": [
    {
      "id": 1,
      "is_accepting_orders": true,
      "is_public": true,
      "bio": "Professional hair stylist with 10 years of experience",
      "years_of_experience": 10,
      "certifications": ["Certified Cosmetologist", "Color Specialist"],
      "full_name": "Jane Doe",
      "avatar_url": "https://example.com/avatar.jpg",
      "age": 32,
      "gender": "female",
      "services": [
        {
          "id": 1,
          "service_category_id": 1,
          "service_category_name": "Hair Styling",
          "pricing": "fixed",
          "fixed_price": 50.00,
          "min_price": null,
          "max_price": null,
          "location": "both"
        }
      ],
      "schedules": [
        {
          "id": 1,
          "day_of_week": 1,
          "start_time": "09:00",
          "end_time": "17:00"
        }
      ],
      "address": {
        "governorate": "Capital",
        "town": "Manama",
        "country": "Bahrain"
      }
    }
  ],
  "page_id": 1,
  "page_size": 10
}
```

### Error (400 Bad Request)

```json
{
  "error": "Key: 'listPublicFreelancersRequest.PageID' Error:Field validation for 'PageID' failed on the 'required' tag"
}
```

#### Validation Errors

```json
{
  "error": "min_age cannot be greater than max_age"
}
```

```json
{
  "error": "min_price cannot be greater than max_price"
}
```

```json
{
  "error": "min_experience cannot be greater than max_experience"
}
```

### Error (500 Internal Server Error)

```json
{
  "error": "database error message"
}
```

## Response Fields

| Field               | Type     | Description                                |
|---------------------|----------|--------------------------------------------|
| `id`                | integer  | Freelancer ID                              |
| `is_accepting_orders` | boolean | Whether freelancer is accepting new orders |
| `is_public`         | boolean  | Whether profile is publicly visible        |
| `bio`               | string   | Freelancer biography (nullable)            |
| `years_of_experience` | integer | Years of professional experience          |
| `certifications`    | string[] | List of certifications                     |
| `full_name`         | string   | Freelancer's full name                     |
| `avatar_url`        | string   | Profile picture URL (nullable)             |
| `age`               | integer  | Calculated age from date of birth (nullable)|
| `gender`            | string   | Gender: `male` or `female`                 |
| `services`          | array    | List of services offered                   |
| `schedules`         | array    | Weekly availability schedule               |
| `address`           | object   | Default address information                |

### Service Object

| Field                  | Type    | Description                                        |
|------------------------|---------|----------------------------------------------------|
| `id`                   | integer | Service category ID                                |
| `service_category_id`  | integer | Service category ID                                |
| `service_category_name`| string  | Name of service category                           |
| `pricing`              | string  | Pricing type: `fixed` or `range`                   |
| `fixed_price`          | number  | Fixed price (when pricing is `fixed`)              |
| `min_price`            | number  | Minimum price (when pricing is `range`)            |
| `max_price`            | number  | Maximum price (when pricing is `range`)            |
| `location`             | string  | Service location: `on_premise`, `door_step`, `both`|

### Schedule Object

| Field        | Type    | Description                        |
|--------------|---------|------------------------------------|
| `id`         | integer | Schedule entry ID                  |
| `day_of_week`| integer | Day of week (0=Sunday, 6=Saturday) |
| `start_time` | string  | Start time (HH:MM format)          |
| `end_time`   | string  | End time (HH:MM format)            |

### Address Object

| Field        | Type   | Description                         |
|--------------|--------|-------------------------------------|
| `governorate`| string | Governorate/Province (nullable)     |
| `town`       | string | Town/City (nullable)                |
| `country`    | string | Country (default: "Bahrain")        |
