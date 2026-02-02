export type Language = 'en' | 'ru' | 'de';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // App
    'app.title': 'School Trainer',
    'app.logout': 'Logout',
    
    // Navigation
    'nav.topics': 'Topics',
    'nav.students': 'Students',
    'nav.dashboard': 'Dashboard',
    
    // Common
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.assignments': 'Assignments',
    'dashboard.recentWorksheets': 'Recent Worksheets',
    'dashboard.practice': 'Practice',
    'dashboard.noAssignments': 'No assignments yet',
    'dashboard.noWorksheets': 'No worksheets yet',
    'dashboard.pending': 'pending',
    'dashboard.today': 'today',
    'dashboard.yesterday': 'yesterday',
    'dashboard.daysAgo': 'days ago',
    'dashboard.weeksAgo': 'weeks ago',
    'dashboard.monthsAgo': 'months ago',
    'dashboard.yearsAgo': 'years ago',
    'dashboard.worksheetsCompletedLast7Days': 'Worksheets completed in last 7 days',
    'dashboard.lastWorksheet': 'Last worksheet',
    
    // Worksheet
    'worksheet.title': 'Worksheet',
    'worksheet.score': 'Score',
    'worksheet.check': 'Check',
    'worksheet.submit': 'Submit',
    'worksheet.regenerate': 'Re-generate',
    'worksheet.regenerating': 'Regenerating...',
    'worksheet.regenerateConfirm': 'Are you sure you want to regenerate this worksheet?',
    'worksheet.regenerateWarning': 'This will delete the current worksheet and create a new one.',
    'worksheet.print': 'Print',
    'worksheet.exercises': 'exercises',
    'worksheet.of': 'of',
    'worksheet.complete': 'Complete',
    'worksheet.completing': 'Completing',
    
    // Topics
    'topics.title': 'Topics',
    'topics.create': 'Create Topic',
    'topics.edit': 'Edit Topic',
    'topics.subject': 'Subject',
    'topics.shortName': 'Short Name',
    'topics.taskDescription': 'Task Description',
    'topics.prompt': 'Prompt (for AI generation)',
    'topics.defaultExerciseCount': 'Default Exercise Count',
    'topics.testExercise': 'Test Exercise',
    'topics.regenerateTest': 'Regenerate Test',
    'topics.testExercisePreview': 'Test Exercise Preview:',
    'topics.translate': 'DE',
    'topics.revert': 'Revert',
    
    // Students
    'students.title': 'Students',
    'students.noStudents': 'No students found',
    'students.assignments': 'Assignments',
    'students.recentWorksheets': 'Recent Worksheets',
    'students.exercises': 'exercises',
    
    // Errors
    'error.worksheetNotFound': 'Worksheet not found',
    'error.failedToLoad': 'Failed to load data',
    'error.failedToSave': 'Failed to save',
    'error.failedToDelete': 'Failed to delete',
    'error.failedToGenerate': 'Failed to generate worksheet',
    'error.noAssignments': 'No topic assignments found for this subject. Please contact your trainer.',
    'error.failedToLoadWorksheet': 'Failed to load worksheet',
    'error.failedToSubmitWorksheet': 'Failed to submit worksheet',
    'error.failedToRegenerateWorksheet': 'Failed to regenerate worksheet. Please try again or contact your trainer.',
    'error.failedToCreateWorksheet': 'Failed to create worksheet. Please try again or contact your trainer.',
    'error.failedToUpdateAssignment': 'Failed to update assignment',
    'error.failedToDeleteAssignment': 'Failed to delete assignment',
    'error.failedToLoadTopics': 'Failed to load topics',
    'error.failedToDeleteTopic': 'Failed to delete topic',
    'error.failedToSaveTopic': 'Failed to save topic',
    'error.failedToTranslate': 'Failed to translate',
    'error.failedToGenerateTest': 'Failed to generate test exercise',
    'error.failedToLoadStudents': 'Failed to load students',
    'error.failedToLoadStudentData': 'Failed to load student data',
    'error.failedToReloadData': 'Failed to reload data',
    'error.failedToAssignTopic': 'Failed to assign topic',
    'error.failedToUnassignTopic': 'Failed to unassign topic',
    'error.failedToLoadData': 'Failed to load data',
    'error.failedToLogin': 'Failed to log in',
    'error.failedToRegister': 'Failed to register',
    'error.passwordsDoNotMatch': 'Passwords do not match',
    'error.passwordTooShort': 'Password must be at least 6 characters',
    'error.noPermission': 'You do not have permission to view this worksheet',
    'error.studentNotFound': 'Student not found',
    'error.unknownError': 'Unknown error occurred',
    'error.noExercisesGenerated': 'No exercises could be generated. Please contact your trainer.',
    
    // Validation
    'validation.subjectRequired': 'Subject is required',
    'validation.shortNameRequired': 'Short name is required',
    'validation.taskDescriptionRequired': 'Task description is required',
    'validation.promptRequired': 'Prompt is required',
    'validation.enterPromptFirst': 'Please enter a prompt first',
    'validation.enterShortNameFirst': 'Please enter a short name first',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.emailAddress': 'Email Address',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.displayNameOptional': 'Display Name (optional)',
    'auth.role': 'Role',
    'auth.student': 'Student',
    'auth.trainer': 'Trainer',
    'auth.signIn': 'Sign In',
    'auth.loggingIn': 'Logging in...',
    'auth.registering': 'Registering...',
    'auth.dontHaveAccount': "Don't have an account? Register",
    'auth.alreadyHaveAccount': 'Already have an account? Login',
    
    // Dashboard
    'dashboard.studentDashboard': 'Student Dashboard',
    'dashboard.noSubjectsAssigned': 'No subjects assigned yet. Please contact your trainer to get started.',
    'dashboard.recentWorksheetsTitle': 'Recent Worksheets',
    
    // Assignments
    'assignments.title': 'Assignments',
    'assignments.noDescription': 'No description',
    'assignments.exercises': 'Exercises',
    'assignments.practice': 'Practice',
    'assignments.generating': 'Generating...',
    'assignments.exercisesOf': 'exercises',
    
    // Topics Screen
    'topics.noTopicsYet': 'No topics yet. Create your first topic to get started.',
    'topics.noTopicsForSubject': 'No {subject} topics yet',
    'topics.promptLabel': 'Prompt:',
    'topics.deleteConfirm': 'Are you sure you want to delete this topic?',
    
    // Student Detail
    'studentDetail.assignTopics': 'Assign Topics',
    'studentDetail.noSubjectsAssigned': 'No subjects assigned yet. Click "Assign Topics" to get started.',
    
    // Assign Topics Dialog
    'assignTopics.title': 'Assign Topics',
    'assignTopics.filterBySubject': 'Filter by Subject',
    'assignTopics.allSubjects': 'All Subjects',
    'assignTopics.searchTopics': 'Search Topics',
    'assignTopics.searchPlaceholder': 'Search by name or description...',
    'assignTopics.noTopicsFound': 'No topics found matching your filters',
    'assignTopics.noTopicsAvailable': 'No topics available',
    'assignTopics.subject': 'Subject:',
    'assignTopics.close': 'Close',
    
    // Exercise Block
    'exercise.correct': 'Correct:',
    'exercise.incorrect': 'Incorrect',
    'exercise.userInput': 'User input:',
    
    // Common phrases
    'common.unknownDate': 'Unknown date',
    'common.deleteConfirm': 'Are you sure you want to delete this?',
  },
  ru: {
    // App
    'app.title': 'Школьный Тренер',
    'app.logout': 'Выйти',
    
    // Navigation
    'nav.topics': 'Темы',
    'nav.students': 'Студенты',
    'nav.dashboard': 'Панель управления',
    
    // Common
    'common.back': 'Назад',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.create': 'Создать',
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успешно',
    'common.confirm': 'Подтвердить',
    'common.close': 'Закрыть',
    
    // Dashboard
    'dashboard.title': 'Панель управления',
    'dashboard.assignments': 'Задания',
    'dashboard.recentWorksheets': 'Последние рабочие листы',
    'dashboard.practice': 'Практика',
    'dashboard.noAssignments': 'Пока нет заданий',
    'dashboard.noWorksheets': 'Пока нет рабочих листов',
    'dashboard.pending': 'в ожидании',
    'dashboard.today': 'сегодня',
    'dashboard.yesterday': 'вчера',
    'dashboard.daysAgo': 'дней назад',
    'dashboard.weeksAgo': 'недель назад',
    'dashboard.monthsAgo': 'месяцев назад',
    'dashboard.yearsAgo': 'лет назад',
    'dashboard.worksheetsCompletedLast7Days': 'Рабочих листов выполнено за последние 7 дней',
    'dashboard.lastWorksheet': 'Последний рабочий лист',
    
    // Worksheet
    'worksheet.title': 'Рабочий лист',
    'worksheet.score': 'Оценка',
    'worksheet.check': 'Проверить',
    'worksheet.submit': 'Отправить',
    'worksheet.regenerate': 'Пересоздать',
    'worksheet.regenerating': 'Пересоздание...',
    'worksheet.regenerateConfirm': 'Вы уверены, что хотите пересоздать этот рабочий лист?',
    'worksheet.regenerateWarning': 'Это удалит текущий рабочий лист и создаст новый.',
    'worksheet.print': 'Печать',
    'worksheet.exercises': 'упражнений',
    'worksheet.of': 'из',
    'worksheet.complete': 'Завершить',
    'worksheet.completing': 'Завершение',
    
    // Topics
    'topics.title': 'Темы',
    'topics.create': 'Создать тему',
    'topics.edit': 'Редактировать тему',
    'topics.subject': 'Предмет',
    'topics.shortName': 'Краткое название',
    'topics.taskDescription': 'Описание задания',
    'topics.prompt': 'Подсказка (для генерации ИИ)',
    'topics.defaultExerciseCount': 'Количество упражнений по умолчанию',
    'topics.testExercise': 'Тестовое упражнение',
    'topics.regenerateTest': 'Пересоздать тест',
    'topics.testExercisePreview': 'Предпросмотр тестового упражнения:',
    'topics.translate': 'DE',
    'topics.revert': 'Отменить',
    
    // Students
    'students.title': 'Студенты',
    'students.noStudents': 'Студенты не найдены',
    'students.assignments': 'Задания',
    'students.recentWorksheets': 'Последние рабочие листы',
    'students.exercises': 'упражнений',
    
    // Errors
    'error.worksheetNotFound': 'Рабочий лист не найден',
    'error.failedToLoad': 'Не удалось загрузить данные',
    'error.failedToSave': 'Не удалось сохранить',
    'error.failedToDelete': 'Не удалось удалить',
    'error.failedToGenerate': 'Не удалось создать рабочий лист',
    'error.noAssignments': 'Не найдено заданий по темам для этого предмета. Пожалуйста, свяжитесь с вашим тренером.',
    'error.failedToLoadWorksheet': 'Не удалось загрузить рабочий лист',
    'error.failedToSubmitWorksheet': 'Не удалось отправить рабочий лист',
    'error.failedToRegenerateWorksheet': 'Не удалось пересоздать рабочий лист. Пожалуйста, попробуйте снова или свяжитесь с вашим тренером.',
    'error.failedToCreateWorksheet': 'Не удалось создать рабочий лист. Пожалуйста, попробуйте снова или свяжитесь с вашим тренером.',
    'error.failedToUpdateAssignment': 'Не удалось обновить задание',
    'error.failedToDeleteAssignment': 'Не удалось удалить задание',
    'error.failedToLoadTopics': 'Не удалось загрузить темы',
    'error.failedToDeleteTopic': 'Не удалось удалить тему',
    'error.failedToSaveTopic': 'Не удалось сохранить тему',
    'error.failedToTranslate': 'Не удалось перевести',
    'error.failedToGenerateTest': 'Не удалось создать тестовое упражнение',
    'error.failedToLoadStudents': 'Не удалось загрузить студентов',
    'error.failedToLoadStudentData': 'Не удалось загрузить данные студента',
    'error.failedToReloadData': 'Не удалось перезагрузить данные',
    'error.failedToAssignTopic': 'Не удалось назначить тему',
    'error.failedToUnassignTopic': 'Не удалось отменить назначение темы',
    'error.failedToLoadData': 'Не удалось загрузить данные',
    'error.failedToLogin': 'Не удалось войти',
    'error.failedToRegister': 'Не удалось зарегистрироваться',
    'error.passwordsDoNotMatch': 'Пароли не совпадают',
    'error.passwordTooShort': 'Пароль должен содержать не менее 6 символов',
    'error.noPermission': 'У вас нет разрешения на просмотр этого рабочего листа',
    'error.studentNotFound': 'Студент не найден',
    'error.unknownError': 'Произошла неизвестная ошибка',
    'error.noExercisesGenerated': 'Не удалось создать упражнения. Пожалуйста, свяжитесь с вашим тренером.',
    
    // Validation
    'validation.subjectRequired': 'Предмет обязателен',
    'validation.shortNameRequired': 'Краткое название обязательно',
    'validation.taskDescriptionRequired': 'Описание задания обязательно',
    'validation.promptRequired': 'Подсказка обязательна',
    'validation.enterPromptFirst': 'Пожалуйста, сначала введите подсказку',
    'validation.enterShortNameFirst': 'Пожалуйста, сначала введите краткое название',
    
    // Auth
    'auth.login': 'Вход',
    'auth.register': 'Регистрация',
    'auth.emailAddress': 'Адрес электронной почты',
    'auth.password': 'Пароль',
    'auth.confirmPassword': 'Подтвердите пароль',
    'auth.displayNameOptional': 'Отображаемое имя (необязательно)',
    'auth.role': 'Роль',
    'auth.student': 'Студент',
    'auth.trainer': 'Тренер',
    'auth.signIn': 'Войти',
    'auth.loggingIn': 'Вход...',
    'auth.registering': 'Регистрация...',
    'auth.dontHaveAccount': 'Нет аккаунта? Зарегистрируйтесь',
    'auth.alreadyHaveAccount': 'Уже есть аккаунт? Войдите',
    
    // Dashboard
    'dashboard.studentDashboard': 'Панель управления студента',
    'dashboard.noSubjectsAssigned': 'Пока не назначены предметы. Пожалуйста, свяжитесь с вашим тренером, чтобы начать.',
    'dashboard.recentWorksheetsTitle': 'Последние рабочие листы',
    
    // Assignments
    'assignments.title': 'Задания',
    'assignments.noDescription': 'Нет описания',
    'assignments.exercises': 'Упражнения',
    'assignments.practice': 'Практика',
    'assignments.generating': 'Создание...',
    'assignments.exercisesOf': 'упражнений',
    
    // Topics Screen
    'topics.noTopicsYet': 'Пока нет тем. Создайте первую тему, чтобы начать.',
    'topics.noTopicsForSubject': 'Пока нет тем по {subject}',
    'topics.promptLabel': 'Подсказка:',
    'topics.deleteConfirm': 'Вы уверены, что хотите удалить эту тему?',
    
    // Student Detail
    'studentDetail.assignTopics': 'Назначить темы',
    'studentDetail.noSubjectsAssigned': 'Пока не назначены предметы. Нажмите "Назначить темы", чтобы начать.',
    
    // Assign Topics Dialog
    'assignTopics.title': 'Назначить темы',
    'assignTopics.filterBySubject': 'Фильтр по предмету',
    'assignTopics.allSubjects': 'Все предметы',
    'assignTopics.searchTopics': 'Поиск тем',
    'assignTopics.searchPlaceholder': 'Поиск по названию или описанию...',
    'assignTopics.noTopicsFound': 'Темы, соответствующие вашим фильтрам, не найдены',
    'assignTopics.noTopicsAvailable': 'Темы недоступны',
    'assignTopics.subject': 'Предмет:',
    'assignTopics.close': 'Закрыть',
    
    // Exercise Block
    'exercise.correct': 'Правильно:',
    'exercise.incorrect': 'Неверно',
    'exercise.userInput': 'Ввод пользователя:',
    
    // Common phrases
    'common.unknownDate': 'Неизвестная дата',
    'common.deleteConfirm': 'Вы уверены, что хотите удалить это?',
  },
  de: {
    // App
    'app.title': 'Schul-Trainer',
    'app.logout': 'Abmelden',
    
    // Navigation
    'nav.topics': 'Themen',
    'nav.students': 'Schüler',
    'nav.dashboard': 'Dashboard',
    
    // Common
    'common.back': 'Zurück',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.create': 'Erstellen',
    'common.loading': 'Lädt...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.confirm': 'Bestätigen',
    'common.close': 'Schließen',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.assignments': 'Aufgaben',
    'dashboard.recentWorksheets': 'Letzte Arbeitsblätter',
    'dashboard.practice': 'Üben',
    'dashboard.noAssignments': 'Noch keine Aufgaben',
    'dashboard.noWorksheets': 'Noch keine Arbeitsblätter',
    'dashboard.pending': 'ausstehend',
    'dashboard.today': 'heute',
    'dashboard.yesterday': 'gestern',
    'dashboard.daysAgo': 'Tage her',
    'dashboard.weeksAgo': 'Wochen her',
    'dashboard.monthsAgo': 'Monate her',
    'dashboard.yearsAgo': 'Jahre her',
    'dashboard.worksheetsCompletedLast7Days': 'Arbeitsblätter in den letzten 7 Tagen abgeschlossen',
    'dashboard.lastWorksheet': 'Letztes Arbeitsblatt',
    
    // Worksheet
    'worksheet.title': 'Arbeitsblatt',
    'worksheet.score': 'Punktzahl',
    'worksheet.check': 'Prüfen',
    'worksheet.submit': 'Einreichen',
    'worksheet.regenerate': 'Neu erstellen',
    'worksheet.regenerating': 'Wird neu erstellt...',
    'worksheet.regenerateConfirm': 'Sind Sie sicher, dass Sie dieses Arbeitsblatt neu erstellen möchten?',
    'worksheet.regenerateWarning': 'Dies löscht das aktuelle Arbeitsblatt und erstellt ein neues.',
    'worksheet.print': 'Drucken',
    'worksheet.exercises': 'Übungen',
    'worksheet.of': 'von',
    'worksheet.complete': 'Abschließen',
    'worksheet.completing': 'Wird abgeschlossen',
    
    // Topics
    'topics.title': 'Themen',
    'topics.create': 'Thema erstellen',
    'topics.edit': 'Thema bearbeiten',
    'topics.subject': 'Fach',
    'topics.shortName': 'Kurzer Name',
    'topics.taskDescription': 'Aufgabenbeschreibung',
    'topics.prompt': 'Eingabeaufforderung (für KI-Generierung)',
    'topics.defaultExerciseCount': 'Standardanzahl der Übungen',
    'topics.testExercise': 'Testübung',
    'topics.regenerateTest': 'Test neu erstellen',
    'topics.testExercisePreview': 'Vorschau der Testübung:',
    'topics.translate': 'DE',
    'topics.revert': 'Rückgängig',
    
    // Students
    'students.title': 'Schüler',
    'students.noStudents': 'Keine Schüler gefunden',
    'students.assignments': 'Aufgaben',
    'students.recentWorksheets': 'Letzte Arbeitsblätter',
    'students.exercises': 'Übungen',
    
    // Errors
    'error.worksheetNotFound': 'Arbeitsblatt nicht gefunden',
    'error.failedToLoad': 'Daten konnten nicht geladen werden',
    'error.failedToSave': 'Speichern fehlgeschlagen',
    'error.failedToDelete': 'Löschen fehlgeschlagen',
    'error.failedToGenerate': 'Arbeitsblatt konnte nicht erstellt werden',
    'error.noAssignments': 'Keine Themenzuweisungen für dieses Fach gefunden. Bitte kontaktieren Sie Ihren Trainer.',
    'error.failedToLoadWorksheet': 'Arbeitsblatt konnte nicht geladen werden',
    'error.failedToSubmitWorksheet': 'Arbeitsblatt konnte nicht eingereicht werden',
    'error.failedToRegenerateWorksheet': 'Arbeitsblatt konnte nicht neu erstellt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie Ihren Trainer.',
    'error.failedToCreateWorksheet': 'Arbeitsblatt konnte nicht erstellt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie Ihren Trainer.',
    'error.failedToUpdateAssignment': 'Aufgabe konnte nicht aktualisiert werden',
    'error.failedToDeleteAssignment': 'Aufgabe konnte nicht gelöscht werden',
    'error.failedToLoadTopics': 'Themen konnten nicht geladen werden',
    'error.failedToDeleteTopic': 'Thema konnte nicht gelöscht werden',
    'error.failedToSaveTopic': 'Thema konnte nicht gespeichert werden',
    'error.failedToTranslate': 'Übersetzung fehlgeschlagen',
    'error.failedToGenerateTest': 'Testübung konnte nicht erstellt werden',
    'error.failedToLoadStudents': 'Schüler konnten nicht geladen werden',
    'error.failedToLoadStudentData': 'Schülerdaten konnten nicht geladen werden',
    'error.failedToReloadData': 'Daten konnten nicht neu geladen werden',
    'error.failedToAssignTopic': 'Thema konnte nicht zugewiesen werden',
    'error.failedToUnassignTopic': 'Themenzuweisung konnte nicht aufgehoben werden',
    'error.failedToLoadData': 'Daten konnten nicht geladen werden',
    'error.failedToLogin': 'Anmeldung fehlgeschlagen',
    'error.failedToRegister': 'Registrierung fehlgeschlagen',
    'error.passwordsDoNotMatch': 'Passwörter stimmen nicht überein',
    'error.passwordTooShort': 'Passwort muss mindestens 6 Zeichen lang sein',
    'error.noPermission': 'Sie haben keine Berechtigung, dieses Arbeitsblatt anzuzeigen',
    'error.studentNotFound': 'Schüler nicht gefunden',
    'error.unknownError': 'Unbekannter Fehler aufgetreten',
    'error.noExercisesGenerated': 'Es konnten keine Übungen erstellt werden. Bitte kontaktieren Sie Ihren Trainer.',
    
    // Validation
    'validation.subjectRequired': 'Fach ist erforderlich',
    'validation.shortNameRequired': 'Kurzer Name ist erforderlich',
    'validation.taskDescriptionRequired': 'Aufgabenbeschreibung ist erforderlich',
    'validation.promptRequired': 'Eingabeaufforderung ist erforderlich',
    'validation.enterPromptFirst': 'Bitte geben Sie zuerst eine Eingabeaufforderung ein',
    'validation.enterShortNameFirst': 'Bitte geben Sie zuerst einen kurzen Namen ein',
    
    // Auth
    'auth.login': 'Anmelden',
    'auth.register': 'Registrieren',
    'auth.emailAddress': 'E-Mail-Adresse',
    'auth.password': 'Passwort',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.displayNameOptional': 'Anzeigename (optional)',
    'auth.role': 'Rolle',
    'auth.student': 'Schüler',
    'auth.trainer': 'Trainer',
    'auth.signIn': 'Anmelden',
    'auth.loggingIn': 'Wird angemeldet...',
    'auth.registering': 'Wird registriert...',
    'auth.dontHaveAccount': 'Noch kein Konto? Registrieren',
    'auth.alreadyHaveAccount': 'Bereits ein Konto? Anmelden',
    
    // Dashboard
    'dashboard.studentDashboard': 'Schüler-Dashboard',
    'dashboard.noSubjectsAssigned': 'Noch keine Fächer zugewiesen. Bitte kontaktieren Sie Ihren Trainer, um zu beginnen.',
    'dashboard.recentWorksheetsTitle': 'Letzte Arbeitsblätter',
    
    // Assignments
    'assignments.title': 'Aufgaben',
    'assignments.noDescription': 'Keine Beschreibung',
    'assignments.exercises': 'Übungen',
    'assignments.practice': 'Üben',
    'assignments.generating': 'Wird erstellt...',
    'assignments.exercisesOf': 'Übungen',
    
    // Topics Screen
    'topics.noTopicsYet': 'Noch keine Themen. Erstellen Sie Ihr erstes Thema, um zu beginnen.',
    'topics.noTopicsForSubject': 'Noch keine {subject}-Themen',
    'topics.promptLabel': 'Eingabeaufforderung:',
    'topics.deleteConfirm': 'Sind Sie sicher, dass Sie dieses Thema löschen möchten?',
    
    // Student Detail
    'studentDetail.assignTopics': 'Themen zuweisen',
    'studentDetail.noSubjectsAssigned': 'Noch keine Fächer zugewiesen. Klicken Sie auf "Themen zuweisen", um zu beginnen.',
    
    // Assign Topics Dialog
    'assignTopics.title': 'Themen zuweisen',
    'assignTopics.filterBySubject': 'Nach Fach filtern',
    'assignTopics.allSubjects': 'Alle Fächer',
    'assignTopics.searchTopics': 'Themen suchen',
    'assignTopics.searchPlaceholder': 'Nach Name oder Beschreibung suchen...',
    'assignTopics.noTopicsFound': 'Keine Themen gefunden, die Ihren Filtern entsprechen',
    'assignTopics.noTopicsAvailable': 'Keine Themen verfügbar',
    'assignTopics.subject': 'Fach:',
    'assignTopics.close': 'Schließen',
    
    // Exercise Block
    'exercise.correct': 'Richtig:',
    'exercise.incorrect': 'Falsch',
    'exercise.userInput': 'Benutzereingabe:',
    
    // Common phrases
    'common.unknownDate': 'Unbekanntes Datum',
    'common.deleteConfirm': 'Sind Sie sicher, dass Sie dies löschen möchten?',
  },
};

export const getTranslation = (key: string, language: Language = 'en'): string => {
  return translations[language]?.[key] || translations.en[key] || key;
};

// Subject translations - subjects are stored as constants in DB (e.g., "math", "german")
// but displayed with translations
export const subjectTranslations: Record<Language, Record<string, string>> = {
  en: {
    'math': 'Math',
    'german': 'German',
    'english': 'English',
    'russian': 'Russian',
    'science': 'Science',
    'history': 'History',
    'geography': 'Geography',
    'biology': 'Biology',
    'chemistry': 'Chemistry',
    'physics': 'Physics',
  },
  ru: {
    'math': 'Математика',
    'german': 'Немецкий язык',
    'english': 'Английский язык',
    'russian': 'Русский язык',
    'science': 'Естествознание',
    'history': 'История',
    'geography': 'География',
    'biology': 'Биология',
    'chemistry': 'Химия',
    'physics': 'Физика',
  },
  de: {
    'math': 'Mathematik',
    'german': 'Deutsch',
    'english': 'Englisch',
    'russian': 'Russisch',
    'science': 'Naturwissenschaften',
    'history': 'Geschichte',
    'geography': 'Geographie',
    'biology': 'Biologie',
    'chemistry': 'Chemie',
    'physics': 'Physik',
  },
};

export const translateSubject = (subject: string, language: Language = 'en'): string => {
  try {
    if (!subject) return '';
    const normalizedSubject = subject.toLowerCase().trim();
    return subjectTranslations[language]?.[normalizedSubject] || 
           subjectTranslations.en[normalizedSubject] || 
           (subject.charAt(0) ? subject.charAt(0).toUpperCase() + subject.slice(1) : subject); // Fallback to capitalized original
  } catch (error) {
    console.error('Error translating subject:', error, subject);
    return subject || '';
  }
};

/**
 * Reverse translates a subject name back to its constant value.
 * If the input is a translated name in any language, returns the constant.
 * If the input is already a constant, returns it normalized.
 */
export const getSubjectConstant = (input: string): string => {
  try {
    if (!input) return '';
    const normalizedInput = input.toLowerCase().trim();
    
    // First, check if it's already a constant subject name
    const allConstants = Object.keys(subjectTranslations.en);
    const matchingConstant = allConstants.find(constant => constant.toLowerCase() === normalizedInput);
    if (matchingConstant) {
      return matchingConstant;
    }
    
    // Then, check if it matches any translated name in any language
    for (const lang of ['en', 'ru', 'de'] as Language[]) {
      for (const [constant, translated] of Object.entries(subjectTranslations[lang])) {
        if (translated.toLowerCase() === normalizedInput) {
          return constant;
        }
      }
    }
    
    // If not found, return the input as-is (normalized)
    return normalizedInput;
  } catch (error) {
    console.error('Error getting subject constant:', error, input);
    return input.toLowerCase().trim();
  }
};
