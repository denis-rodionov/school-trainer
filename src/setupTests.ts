// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

jest.mock('./services/firebase', () => ({
  auth: {},
  db: {},
  default: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return jest.fn();
  }),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('./services/auth', () => ({
  getUserData: jest.fn().mockResolvedValue(null),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('./services/users', () => ({
  updateUserLanguage: jest.fn().mockResolvedValue(undefined),
  getUserSubjects: jest.fn().mockResolvedValue([]),
  getSubjectData: jest.fn().mockResolvedValue(null),
  getUsers: jest.fn().mockResolvedValue([]),
  getStudents: jest.fn().mockResolvedValue([]),
}));

jest.mock('./services/topics', () => ({
  getTopics: jest.fn().mockResolvedValue([]),
  getTopicsBySubject: jest.fn().mockResolvedValue([]),
  getTopic: jest.fn().mockResolvedValue(null),
  createTopic: jest.fn(),
  updateTopic: jest.fn(),
  deleteTopic: jest.fn(),
}));

jest.mock('./services/worksheets', () => ({
  getRecentWorksheets: jest.fn().mockResolvedValue([]),
  getPendingWorksheetBySubject: jest.fn().mockResolvedValue(null),
  getWorksheetsByStudent: jest.fn().mockResolvedValue([]),
  getWorksheet: jest.fn().mockResolvedValue(null),
  getExercises: jest.fn().mockResolvedValue([]),
}));

jest.mock('./contexts/AuthContext');
