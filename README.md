# School Trainer Web Application

A Firebase-hosted React web application designed to help children practice school subjects like Math and German. The application supports separate student and trainer accounts with role-based access control.

## Features

- **Student Accounts**: Practice worksheets, view statistics, and track progress
- **Trainer Accounts**: Create and manage topics, assign topics to students, and view student progress
- **Worksheet System**: Dynamic worksheet generation based on topic assignments
- **Statistics Tracking**: Track worksheets completed in the last 7 days and last worksheet date
- **Real-time Updates**: Built on Firebase for real-time data synchronization

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **State Management**: React Context API
- **Date Utilities**: date-fns

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)

## Initial Setup

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable the following services:
   - **Authentication**: Enable Email/Password authentication
   - **Firestore Database**: Create database in production mode (we'll add security rules)
   - **Hosting**: Enable Firebase Hosting

### 2. Get Firebase Configuration

1. In Firebase Console, go to Project Settings
2. Scroll down to "Your apps" section
3. Click on the web icon (`</>`) to add a web app
4. Copy the Firebase configuration object
5. Create a `.env.local` file in the project root:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 3. Firebase CLI Setup

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in the project:
```bash
firebase init
```

Select the following options:
- **Firestore**: Yes (set up Firestore security rules and indexes)
- **Hosting**: Yes (set up Firebase Hosting)
- **Existing project**: Select your Firebase project
- **Firestore rules file**: `firestore.rules`
- **Firestore indexes file**: `firestore.indexes.json`
- **Public directory**: `build`
- **Single-page app**: Yes
- **Set up automatic builds**: No (for now)

4. Update `.firebaserc` with your project ID:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 4. Install Dependencies

```bash
npm install
```

## Development

### Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

### Firebase Emulators (Optional)

For local development with Firebase emulators:

1. Install emulators:
```bash
firebase init emulators
```

2. Start emulators:
```bash
firebase emulators:start
```

3. Update `.env.local` to point to emulators (if needed)

## Deployment

### Deploy Everything

```bash
npm run build
firebase deploy
```

This will deploy:
- Firestore security rules
- Firestore indexes
- Hosting (React app)

### Deploy Only Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Deploy Only Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Only Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## Secrets Management

### Local Development

- Store Firebase config in `.env.local` (already in `.gitignore`)
- Never commit `.env.local` to version control

### Production

Firebase Hosting automatically uses environment variables from:
- Firebase Console → Hosting → Environment variables
- Or use Firebase Functions for server-side secrets (if needed in future)

### Firebase Functions (Future)

If you need server-side secrets:
```bash
firebase functions:config:set someservice.key="THE API KEY"
```

## Seed Data

To populate the database with initial test data:

1. Login as the user with email `den-iu7@mail.ru`
2. The seed script will automatically check if collections are empty
3. Run the seed function from the browser console or create an admin UI button

The seed script creates:
- 1 trainer user (trainer@test.com / trainer123)
- 2 student users (student1@test.com / student123, student2@test.com / student123)
- Topics for Math and German subjects
- Topic assignments for students
- Sample completed worksheets

**Note**: The seed script only runs if:
- Current user email is `den-iu7@mail.ru`
- All collections (users, topics, worksheets) are empty

## Project Structure

```
school-trainer/
├── public/                 # Static files
├── src/
│   ├── components/         # React components
│   │   ├── Auth/          # Login/Register
│   │   ├── Layout/        # App layout and navigation
│   │   ├── Student/       # Student dashboard
│   │   ├── Trainer/       # Trainer screens
│   │   └── Worksheet/     # Worksheet components
│   ├── contexts/          # React contexts (Auth)
│   ├── services/          # Firebase service functions
│   ├── scripts/           # Utility scripts (seed data)
│   ├── types/             # TypeScript type definitions
│   └── utils/              # Utility functions
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
└── .env.local             # Environment variables (gitignored)
```

## Firestore Data Structure

### Collections

- **users**: User accounts with role (student/trainer)
  - **subjects/{subjectName}**: Subject data with topic assignments and statistics
- **topics**: Topics for different subjects
- **worksheets**: Student worksheets
  - **exercises/{exerciseId}**: Exercises for each worksheet

## Security Rules

Firestore security rules are defined in `firestore.rules`:
- Users can read their own data
- Trainers can read all user data
- Only trainers can create/edit topics
- Students can only access their own worksheets
- Trainers can view all worksheets

## Troubleshooting

### Build Errors

- Ensure all environment variables are set in `.env.local`
- Check that Firebase project ID matches in `.firebaserc`

### Authentication Issues

- Verify Email/Password authentication is enabled in Firebase Console
- Check that security rules allow user creation

### Firestore Errors

- Ensure Firestore is enabled in Firebase Console
- Check security rules are deployed: `firebase deploy --only firestore:rules`

### Hosting Issues

- Build the app first: `npm run build`
- Check `firebase.json` configuration
- Verify public directory is set to `build`

## Development Workflow

1. Make code changes
2. Test locally: `npm start`
3. Build: `npm run build`
4. Test build locally (optional): `npx serve -s build`
5. Deploy: `firebase deploy`

## Future Enhancements

- AI-powered exercise generation using topic prompts
- More sophisticated statistics and analytics
- Progress tracking and reports
- Multiple language support
- Mobile app version

## License

[Add your license here]

## Support

For issues or questions, please contact [your contact information]
