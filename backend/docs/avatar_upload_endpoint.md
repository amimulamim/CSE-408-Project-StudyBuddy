# Avatar Upload Endpoint

## Overview

The avatar upload endpoint allows authenticated users to upload and update their profile photos. The endpoint handles file validation, Firebase Storage upload, and database updates.

## Endpoint Details

**URL:** `PUT /api/v1/user/profile/avatar`

**Authentication:** Required (Bearer token)

**Rate Limiting:** 10 requests per minute per user

**Content Type:** `multipart/form-data`

## Request Format

```http
PUT /api/v1/user/profile/avatar HTTP/1.1
Host: your-api-domain.com
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="avatar"; filename="profile.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary--
```

## File Requirements

- **Supported formats:** JPEG, JPG, PNG, GIF, WebP
- **Maximum file size:** 5MB
- **Field name:** `avatar`

## Response Examples

### Success Response (200)

```json
{
  "avatar_url": "https://storage.googleapis.com/your-bucket/avatars/1708123456_a1b2c3d4.jpg",
  "message": "Profile photo updated successfully"
}
```

### Error Responses

#### Invalid file type (400)
```json
{
  "detail": "Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp"
}
```

#### File too large (400)
```json
{
  "detail": "File size too large. Maximum size is 5MB."
}
```

#### Rate limit exceeded (429)
```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```

#### User not found (404)
```json
{
  "detail": "User not found"
}
```

## Implementation Examples

### JavaScript/Fetch API

```javascript
async function uploadAvatar(file, authToken) {
  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const response = await fetch('/api/v1/user/profile/avatar', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Avatar uploaded:', result.avatar_url);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById('avatar-input');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const result = await uploadAvatar(file, 'your-jwt-token');
      // Update UI with new avatar URL
      document.getElementById('profile-image').src = result.avatar_url;
    } catch (error) {
      alert('Failed to upload avatar: ' + error.message);
    }
  }
});
```

### Python/Requests

```python
import requests

def upload_avatar(file_path, auth_token):
    url = "https://your-api-domain.com/api/v1/user/profile/avatar"
    
    headers = {
        "Authorization": f"Bearer {auth_token}"
    }
    
    with open(file_path, "rb") as file:
        files = {"avatar": ("avatar.jpg", file, "image/jpeg")}
        
        response = requests.put(url, headers=headers, files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"Avatar uploaded: {result['avatar_url']}")
            return result
        else:
            print(f"Upload failed: {response.status_code} - {response.text}")
            response.raise_for_status()

# Usage
try:
    result = upload_avatar("profile_photo.jpg", "your-jwt-token")
except requests.RequestException as e:
    print(f"Error: {e}")
```

### cURL

```bash
curl -X PUT \
  https://your-api-domain.com/api/v1/user/profile/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "avatar=@/path/to/your/image.jpg"
```

## Features

1. **Automatic cleanup:** Old avatars are automatically deleted from Firebase Storage when a new one is uploaded
2. **File validation:** Strict validation of file type and size before upload
3. **Rate limiting:** Prevents abuse with configurable rate limits
4. **Audit logging:** All avatar changes are logged for security purposes
5. **Error handling:** Comprehensive error responses for different failure scenarios

## Security Considerations

- Only authenticated users can upload avatars
- File type validation prevents malicious file uploads  
- File size limits prevent storage abuse
- Rate limiting prevents spam uploads
- Old avatars are cleaned up to prevent storage bloat
- All changes are audited and logged

## Integration Notes

- The avatar URL returned can be used directly in `<img>` tags
- Firebase Storage URLs are public and CDN-optimized
- The database `user.avatar` field is automatically updated
- Compatible with existing profile edit endpoints
