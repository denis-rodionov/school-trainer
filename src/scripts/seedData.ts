import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { auth } from '../services/firebase';
import { register } from '../services/auth';
import { createTopic } from '../services/topics';
import { createWorksheet } from '../services/worksheets';
import { setSubjectData } from '../services/users';

const SEED_EMAIL = 'den-iu7@mail.ru';

export const seedData = async () => {
  // Check if current user is the seed user
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.email !== SEED_EMAIL) {
    console.log('Seed script can only be run by', SEED_EMAIL);
    return;
  }

  // Check if collections are empty
  const [usersSnapshot, topicsSnapshot, worksheetsSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'topics')),
    getDocs(collection(db, 'worksheets')),
  ]);

  if (usersSnapshot.size > 0 || topicsSnapshot.size > 0 || worksheetsSnapshot.size > 0) {
    console.log('Collections are not empty. Skipping seed.');
    return;
  }

  console.log('Starting seed data...');

  try {
    // Create trainer user
    const trainerEmail = 'trainer@test.com';
    const trainerPassword = 'trainer123';
    let trainerUser;
    try {
      trainerUser = await register(trainerEmail, trainerPassword, 'trainer', 'Trainer User');
      console.log('Created trainer user');
    } catch (err: any) {
      console.error('Error creating trainer:', err);
      // Trainer might already exist, try to get it
      throw new Error('Could not create trainer user');
    }

    // Create student users
    const student1Email = 'student1@test.com';
    const student1Password = 'student123';
    const student2Email = 'student2@test.com';
    const student2Password = 'student123';

    const student1 = await register(student1Email, student1Password, 'student', 'Student One');
    const student2 = await register(student2Email, student2Password, 'student', 'Student Two');
    console.log('Created student users');

    // Create topics
    const mathTopics = [
      {
        subject: 'math' as const,
        shortName: 'Addition',
        taskDescription: 'Solve the addition problems by filling in the blanks.',
        prompt: 'Generate addition problems with numbers between 1 and 50',
        createdBy: trainerUser.uid,
      },
      {
        subject: 'math' as const,
        shortName: 'Subtraction',
        taskDescription: 'Solve the subtraction problems by filling in the blanks.',
        prompt: 'Generate subtraction problems with numbers between 1 and 50',
        createdBy: trainerUser.uid,
      },
      {
        subject: 'math' as const,
        shortName: 'Division with remainder',
        taskDescription: 'Calculate the division and find the remainder.',
        prompt: 'Generate division problems with remainders',
        createdBy: trainerUser.uid,
      },
    ];

    const germanTopics = [
      {
        subject: 'german' as const,
        shortName: 'Vocabulary',
        taskDescription: 'Translate the words from English to German.',
        prompt: 'Generate vocabulary translation exercises',
        createdBy: trainerUser.uid,
      },
      {
        subject: 'german' as const,
        shortName: 'Grammar',
        taskDescription: 'Fill in the correct verb forms.',
        prompt: 'Generate German grammar exercises with verb conjugation',
        createdBy: trainerUser.uid,
      },
      {
        subject: 'german' as const,
        shortName: 'Reading comprehension',
        taskDescription: 'Read the text and answer the questions.',
        prompt: 'Generate reading comprehension questions in German',
        createdBy: trainerUser.uid,
      },
    ];

    const allTopics = [...mathTopics, ...germanTopics];
    const topicIds: string[] = [];

    for (const topic of allTopics) {
      const topicId = await createTopic(topic);
      topicIds.push(topicId);
      console.log(`Created topic: ${topic.shortName}`);
    }

    // Create subject data for students with topic assignments
    const mathTopicIds = topicIds.slice(0, 3);
    const germanTopicIds = topicIds.slice(3, 6);

    for (const student of [student1, student2]) {
      // Math subject
      await setSubjectData(student.uid, 'math', {
        subject: 'math',
        topicAssignments: [
          { topicId: mathTopicIds[0], count: 2 },
          { topicId: mathTopicIds[1], count: 2 },
          { topicId: mathTopicIds[2], count: 1 },
        ],
        statistics: {
          worksheetsLast7Days: 0,
        },
      });

      // German subject
      await setSubjectData(student.uid, 'german', {
        subject: 'german',
        topicAssignments: [
          { topicId: germanTopicIds[0], count: 2 },
          { topicId: germanTopicIds[1], count: 2 },
          { topicId: germanTopicIds[2], count: 1 },
        ],
        statistics: {
          worksheetsLast7Days: 0,
        },
      });
    }

    console.log('Created subject data for students');

    // Create sample completed worksheets
    const exerciseTemplates = [
      {
        topicId: mathTopicIds[0],
        topicShortName: 'Addition',
        markdown: 'Calculate: 5 + 3 = ___',
        correctAnswers: ['8'],
        order: 0,
      },
      {
        topicId: mathTopicIds[0],
        topicShortName: 'Addition',
        markdown: 'Calculate: 12 + 7 = ___',
        correctAnswers: ['19'],
        order: 1,
      },
      {
        topicId: mathTopicIds[1],
        topicShortName: 'Subtraction',
        markdown: 'Calculate: 10 - 4 = ___',
        correctAnswers: ['6'],
        order: 2,
      },
    ];

    // Create 2-3 completed worksheets per student
    for (const student of [student1, student2]) {
      for (let i = 0; i < 2; i++) {
        const worksheetId = await createWorksheet(student.uid, exerciseTemplates);
        
        // Mark as completed
        const worksheetRef = doc(db, 'worksheets', worksheetId);
        await setDoc(
          worksheetRef,
          {
            status: 'completed',
            score: 85 + i * 5, // Varying scores
            completedAt: Timestamp.fromDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000)), // Different dates
          },
          { merge: true }
        );

        // Add userInput to exercises
        const exercisesRef = collection(db, 'worksheets', worksheetId, 'exercises');
        const exercisesSnapshot = await getDocs(exercisesRef);
        exercisesSnapshot.docs.forEach(async (exDoc) => {
          const exerciseData = exDoc.data();
          const userInput = exerciseData.markdown.replace(/___/g, exerciseData.correctAnswers[0] || '');
          await setDoc(exDoc.ref, { userInput }, { merge: true });
        });

        console.log(`Created completed worksheet for ${student.email}`);
      }
    }

    console.log('Seed data completed successfully!');
  } catch (error: any) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

// Export function to be called from UI (e.g., a button in admin panel)
export default seedData;
