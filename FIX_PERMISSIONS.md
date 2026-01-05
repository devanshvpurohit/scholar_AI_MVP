
# 🚨 How to Fix "Missing or insufficient permissions"

The error occurs because your **Firestore Security Rules** in the Firebase Console are blocking the app. 
Since this is a Serverless App, you MUST allow the app to write to the database.

## 1. Go to Firebase Console
Open this link: [https://console.firebase.google.com/project/medkey-vault/firestore/rules](https://console.firebase.google.com/project/medkey-vault/firestore/rules)

## 2. Edit Rules
Replace the existing code with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // ⚠️ WARNING: Allows anyone to read/write. Use for development.
      allow read, write: if true;
    }
  }
}
```

## 3. Click "Publish"
Once published, wait 10-30 seconds. The app will start working immediately.

---

### 🔒 Better Security (For Production)
Once you confirm it works, change the rule to this to require Login:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
