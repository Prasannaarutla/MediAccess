# Medical Records Upload System with Google Drive Integration

## Overview
A comprehensive medical records upload system has been integrated into the Patient Dashboard with support for multiple file sources and Google Drive integration.

## Features Implemented

### 1. **Four Upload Options**
The system provides four different ways to upload medical records:

#### File Explorer
- Upload files directly from your computer
- Accepts: PNG, JPEG, PDF
- Uses native file input

#### Gallery
- Select images from your device's photo gallery
- Accepts: All image formats
- Auto-filtered to accept images only

#### Camera
- Capture photos in real-time using device webcam
- Converts captured image to JPEG file
- Modal interface with live preview
- Capture and cancel options

#### Google Drive
- Authenticate with Google account
- Browse and select files from Google Drive
- Uses Google Picker API
- Supports drive.readonly scope
- Real OAuth2 integration

### 2. **File Validation**

**Allowed File Types:**
- PNG (image/png)
- JPEG (image/jpeg)
- PDF (application/pdf)

**File Size Limit:**
- Maximum: 5MB per file
- Automated validation with user feedback

**Error Handling:**
- Displays error messages for invalid file types
- Shows file size warnings
- User-friendly error alerts

### 3. **Data Storage**

All medical records are stored in browser localStorage with the following metadata:
```javascript
{
  id: string,           // Unique identifier
  name: string,         // File name
  type: string,         // MIME type
  size: number,         // File size in bytes
  source: string,       // "Local", "Camera", or "Google Drive"
  timestamp: string     // ISO 8601 timestamp
}
```

### 4. **User Interface**

**Upload Cards (2x2 Grid):**
- Responsive grid layout
- Icon-based visual representation
- Hover effects with blue border highlight
- Mobile-friendly (stacks to 2 columns on smaller screens)

**Upload Guidelines Section:**
- Displays supported formats
- Shows file size limitations
- Always visible reference

**Status Messages:**
- Success alerts (green) when files are added
- Error alerts (red) when validation fails
- Auto-dismiss after 3 seconds
- Manual close buttons

**Medical Records List:**
- Shows all uploaded records
- Displays file icon, name, size, source, and date
- Delete functionality for each record
- Empty state with helpful message
- Record count display

### 5. **Key Components**

#### MedicalRecordsUpload.jsx
Main component located at `src/components/MedicalRecordsUpload.jsx`

**Key Functions:**
- `handleFileExplorer()` - Trigger file input
- `handleGallery()` - Trigger gallery input
- `handleCameraCapture()` - Capture from webcam
- `handleGoogleDrive()` - Authenticate and open Google Picker
- `validateFile()` - Validate file type and size
- `addRecord()` - Add record to state and localStorage
- `deleteRecord()` - Remove record from list
- `formatFileSize()` - Format bytes to readable size
- `getFileIcon()` - Return emoji icon for file type

### 6. **Google Drive Integration**

**Authentication Flow:**
1. User clicks "Google Drive" button
2. Google OAuth2 consent screen appears
3. User authenticates with Google account
4. Access token obtained for drive.readonly scope

**File Selection:**
1. Google Picker opens after authentication
2. User selects files from Google Drive
3. File metadata extracted (name, MIME type, size, ID)
4. File validated against allowed types and size limits
5. Record added to list with source: "Google Drive"

**API Credentials:**
- Client ID: `641751633879-top3ashcmnje3mu0fn9i5cet4lm3946k.apps.googleusercontent.com`
- Scope: `https://www.googleapis.com/auth/drive.readonly`

### 7. **Integration with Patient Dashboard**

The MedicalRecordsUpload component is integrated in PatientDashboard.jsx:
- Activated when "Medical Records" sidebar option is clicked
- Displayed in the main content area
- Maintains responsive design consistency
- Persists data in localStorage for the logged-in patient

## File Structure

```
src/
├── components/
│   └── MedicalRecordsUpload.jsx (NEW)
├── pages/
│   └── PatientDashboard.jsx (UPDATED)
└── ...

index.html (UPDATED - Added Google APIs scripts)
```

## Dependencies

**New Package:**
- `react-icons` (Feather icons for UI)

**Already Installed:**
- `react-webcam` (Camera functionality)
- `react-router-dom` (Navigation)

## Google APIs Scripts

Added to index.html:
```html
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

## State Management

Uses React hooks:
- `useState` - For modal visibility, messages, error states
- `useEffect` - For localStorage persistence, initialization
- `useRef` - For file inputs and webcam reference

## Styling

**Tailwind CSS:**
- Card-based layout with hover effects
- Responsive grid system
- Color-coded alerts (green success, red error)
- Accessibility-friendly contrast ratio
- Smooth transitions and animations

## Usage Instructions

1. **Navigate to Medical Records:**
   - Click "Medical Records" in the sidebar

2. **Upload from Local File:**
   - Click "File Explorer"
   - Select PNG, JPEG, or PDF file
   - Max 5MB

3. **Upload from Gallery:**
   - Click "Gallery"
   - Select an image from your device
   - Automatically converted to appropriate format

4. **Capture from Camera:**
   - Click "Camera"
   - Allow camera access if prompted
   - Click "Capture" to take photo
   - Click "Cancel" to discard

5. **Add from Google Drive:**
   - Click "Google Drive"
   - Sign in with Google account
   - Grant permission for drive.readonly access
   - Select file from Google Picker
   - File is added to your records

6. **Manage Records:**
   - View all uploaded records in the list below
   - Click X button to delete any record
   - Records persist in browser localStorage

## Error Handling

**Invalid Format:**
- Message: "Invalid file type. Allowed types: PNG, JPEG, PDF"

**File Too Large:**
- Message: "File size exceeds 5MB limit. File size: X.XXMB"

**Google Authentication Failure:**
- Message: "Google APIs not fully loaded. Please refresh the page and try again."

**Camera Issues:**
- Message: "Failed to process camera image"

**Google Picker Error:**
- Message: "Failed to open Google Picker. Please refresh and try again."

## Limitations and Notes

1. **Frontend Only:**
   - No actual file upload to server
   - Metadata stored in browser localStorage only
   - Data persists until browser cache is cleared

2. **Google Drive:**
   - Read-only access (cannot upload files to Drive)
   - Can only view and select existing files
   - Requires internet connection
   - Google account required

3. **Camera:**
   - Requires HTTPS in production (dev works on HTTP)
   - Browser camera permission required
   - Device must have camera hardware

4. **Storage:**
   - Limited by browser localStorage quota (~5-10MB)
   - Data specific to current browser/device
   - Not synced across devices

## Future Enhancements

1. Add backend API for actual file upload
2. Implement cloud storage integration (AWS S3, etc.)
3. Add file preview functionality
4. Implement drag-and-drop upload
5. Add progress indicators for uploads
6. Support for more file types
7. File sharing and permissions
8. Audit trail for medical records access

## Testing Checklist

- [x] File Explorer upload works
- [x] Gallery image selection works
- [x] Camera capture functionality works
- [x] Google Drive authentication works
- [x] File validation (type and size)
- [x] Error messages display correctly
- [x] Success messages appear and disappear
- [x] Records persist in localStorage
- [x] Delete functionality works
- [x] Responsive design on mobile
- [x] Record list displays correctly
- [x] Empty state message shows

## Support & Troubleshooting

**Google APIs Not Loading:**
- Refresh the page
- Check internet connection
- Clear browser cache
- Verify Google credentials

**Camera Not Working:**
- Check browser permissions
- Allow camera access when prompted
- Ensure device has camera hardware
- Try different browser

**Files Not Saving:**
- Check browser localStorage quota
- Clear browser cache if needed
- Check browser privacy settings
- Ensure localStorage is not disabled

## Implementation Notes

- Clean, modular React code
- Separated concerns (upload handlers, validation, UI)
- Proper error boundaries
- User-friendly success/error feedback
- Responsive and accessible design
- follows React best practices