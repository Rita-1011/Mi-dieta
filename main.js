import './style.css';
import { createClient } from '@supabase/supabase-js';

// =====================
// Configuración de Supabase
// =====================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Falta la configuración de Supabase. Por favor, revisa tus variables de entorno.');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// =====================
// Gestión de Estado
// =====================
let currentUser = null;
let meals = [];
let shoppingItems = [];
let pendingImportCallback = null;
let confirmCallback = null;
let activeMealId = null;
let currentViewDayIndex = -1; // -1 = uninitialised; set to today on first render
let planDocument = null;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// Aplicación en español - el idioma de la UI siempre es español
let currentLanguage = 'es';

function getLanguage() {
  return 'es';
}

const DAY_LABELS = {
  es: { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' },
  en: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
  pt: { monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira', thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo' },
  fr: { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' },
  de: { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag', sunday: 'Sonntag' },
  it: { monday: 'Lunedì', tuesday: 'Martedì', wednesday: 'Mercoledì', thursday: 'Giovedì', friday: 'Venerdì', saturday: 'Sabato', sunday: 'Domenica' },
  nl: { monday: 'Maandag', tuesday: 'Dinsdag', wednesday: 'Woensdag', thursday: 'Donderdag', friday: 'Vrijdag', saturday: 'Zaterdag', sunday: 'Zondag' }
};

const MEAL_TYPE_LABELS = {
  es: { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Colación' },
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
  pt: { breakfast: 'Café da manhã', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche' },
  fr: { breakfast: 'Petit déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' },
  de: { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack' },
  it: { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino' },
  nl: { breakfast: 'Ontbijt', lunch: 'Lunch', dinner: 'Diner', snack: 'Tussendoortje' }
};

const LANGUAGE_LABELS = {
  en: 'Inglés',
  es: 'Español',
  pt: 'Portugués',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  nl: 'Neerlandés'
};

const UI_LABELS = {
  es: {
    dietSectionTitle: 'Mi Plan',
    dietViewName: 'Mi Plan',
    shoppingTitle: 'Lista de la compra',
    emptyTitle: '¡Bienvenido!',
    emptyLine1: 'Todavía no tienes ningún plan de alimentación.',
    emptyLine2: 'Importa tu dieta semanal para empezar a organizarte.',
    emptyButton: 'Importar dieta',
    addItem: 'Añadir',
    generateList: 'Generar desde comidas',
    filterAll: 'Todas',
    filterPending: 'Pendientes',
    filterCompleted: 'Completadas',
    shoppingEmpty: 'Tu lista de la compra está vacía. Genera los artículos desde las comidas o añade uno manualmente.',
    navDiet: 'Mi Plan',
    navImport: 'Importar dieta',
    navShopping: 'Lista de la compra',
    navAssistant: 'Asistente IA',
    navImportMobile: 'Importar',
    navShoppingMobile: 'Compra',
    navAssistantMobile: 'IA'
  },
  en: {
    dietSectionTitle: 'Mi Plan',
    dietViewName: 'Mi Plan',
    shoppingTitle: 'Lista de la compra',
    emptyTitle: '¡Bienvenido!',
    emptyLine1: 'Todavía no tienes ningún plan de alimentación.',
    emptyLine2: 'Importa tu dieta semanal para empezar a organizarte.',
    emptyButton: 'Importar dieta',
    addItem: 'Añadir',
    generateList: 'Generar desde comidas',
    filterAll: 'Todas',
    filterPending: 'Pendientes',
    filterCompleted: 'Completadas',
    shoppingEmpty: 'Tu lista de la compra está vacía. Genera los artículos desde las comidas o añade uno manualmente.',
    navDiet: 'Mi Plan',
    navImport: 'Importar dieta',
    navShopping: 'Lista de la compra',
    navAssistant: 'Asistente IA',
    navImportMobile: 'Importar',
    navShoppingMobile: 'Compra',
    navAssistantMobile: 'IA'
  },
  pt: {
    dietSectionTitle: 'Minha Dieta',
    dietViewName: 'Minha Dieta',
    shoppingTitle: 'Lista de Compras',
    emptyTitle: 'Bem-vindo!',
    emptyLine1: 'Você ainda não tem nenhuma dieta planejada.',
    emptyLine2: 'Importe seu plano alimentar semanal para começar.',
    emptyButton: 'Importar Dieta',
    addItem: 'Adicionar',
    generateList: 'Gerar de comidas',
    filterAll: 'Todas',
    filterPending: 'Pendentes',
    filterCompleted: 'Concluídas',
    shoppingEmpty: 'Sua lista de compras está vazia. Gere a partir das comidas ou adicione artigos manualmente.',
    navDiet: 'Minha Dieta',
    navImport: 'Importar Dieta',
    navShopping: 'Lista de Compras',
    navAssistant: 'Assistente IA',
    navImportMobile: 'Importar',
    navShoppingMobile: 'Compras',
    navAssistantMobile: 'IA'
  },
  fr: {
    dietSectionTitle: 'Mon Régime',
    dietViewName: 'Mon Régime',
    shoppingTitle: 'Liste de Courses',
    emptyTitle: 'Bienvenue !',
    emptyLine1: "Vous n'avez pas encore de régime planifié.",
    emptyLine2: 'Importez votre plan alimentaire hebdomadaire pour commencer.',
    emptyButton: 'Importer un Régime',
    addItem: 'Ajouter',
    generateList: 'Générer depuis les repas',
    filterAll: 'Toutes',
    filterPending: 'En attente',
    filterCompleted: 'Terminées',
    shoppingEmpty: 'Votre liste de courses est vide. Générez-la depuis les repas ou ajoutez des articles manuellement.',
    navDiet: 'Mon Régime',
    navImport: 'Importer un Régime',
    navShopping: 'Liste de Courses',
    navAssistant: 'Assistant IA',
    navImportMobile: 'Importer',
    navShoppingMobile: 'Courses',
    navAssistantMobile: 'IA'
  },
  de: {
    dietSectionTitle: 'Meine Diät',
    dietViewName: 'Meine Diät',
    shoppingTitle: 'Einkaufsliste',
    emptyTitle: 'Willkommen!',
    emptyLine1: 'Sie haben noch keine Diät geplant.',
    emptyLine2: 'Importieren Sie Ihren wöchentlichen Ernährungsplan, um zu beginnen.',
    emptyButton: 'Diät importieren',
    addItem: 'Hinzufügen',
    generateList: 'Aus Mahlzeiten generieren',
    filterAll: 'Alle',
    filterPending: 'Ausstehend',
    filterCompleted: 'Abgeschlossen',
    shoppingEmpty: 'Ihre Einkaufsliste ist leer. Generieren Sie sie aus Mahlzeiten oder fügen Sie Artikel manuell hinzu.',
    navDiet: 'Meine Diät',
    navImport: 'Diät importieren',
    navShopping: 'Einkaufsliste',
    navAssistant: 'KI-Assistent',
    navImportMobile: 'Importieren',
    navShoppingMobile: 'Einkauf',
    navAssistantMobile: 'KI'
  },
  it: {
    dietSectionTitle: 'La Mia Dieta',
    dietViewName: 'La Mia Dieta',
    shoppingTitle: 'Lista della Spesa',
    emptyTitle: 'Benvenuto!',
    emptyLine1: 'Non hai ancora nessuna dieta pianificata.',
    emptyLine2: 'Importa il tuo piano alimentare settimanale per iniziare.',
    emptyButton: 'Importa Dieta',
    addItem: 'Aggiungi',
    generateList: 'Genera dai pasti',
    filterAll: 'Tutte',
    filterPending: 'In attesa',
    filterCompleted: 'Completate',
    shoppingEmpty: 'La tua lista della spesa è vuota. Generala dai pasti o aggiungi articoli manualmente.',
    navDiet: 'La Mia Dieta',
    navImport: 'Importa Dieta',
    navShopping: 'Lista della Spesa',
    navAssistant: 'Assistente IA',
    navImportMobile: 'Importa',
    navShoppingMobile: 'Spesa',
    navAssistantMobile: 'IA'
  },
  nl: {
    dietSectionTitle: 'Mijn Dieet',
    dietViewName: 'Mijn Dieet',
    shoppingTitle: 'Boodschappenlijst',
    emptyTitle: 'Welkom!',
    emptyLine1: 'Je hebt nog geen dieet gepland.',
    emptyLine2: 'Importeer je wekelijkse voedingsplan om te beginnen.',
    emptyButton: 'Dieet importeren',
    addItem: 'Toevoegen',
    generateList: 'Genereren van maaltijden',
    filterAll: 'Alle',
    filterPending: 'In behandeling',
    filterCompleted: 'Voltooid',
    shoppingEmpty: 'Je boodschappenlijst is leeg. Genereer vanuit maaltijden of voeg items handmatig toe.',
    navDiet: 'Mijn Dieet',
    navImport: 'Dieet importeren',
    navShopping: 'Boodschappenlijst',
    navAssistant: 'AI-assistent',
    navImportMobile: 'Importeren',
    navShoppingMobile: 'Boodschappen',
    navAssistantMobile: 'AI'
  }
};

function updateUILanguage() {
  const lang = getLanguage();
  const labels = UI_LABELS[lang] || UI_LABELS.en;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText('diet-section-title', labels.dietSectionTitle);
  setText('diet-view-name', labels.dietViewName);
  setText('shopping-title', labels.shoppingTitle);
  setText('diet-empty-title', labels.emptyTitle);
  setText('diet-empty-line1', labels.emptyLine1);
  setText('diet-empty-line2', labels.emptyLine2);
  setText('diet-empty-import-btn', labels.emptyButton);
  setText('add-item-btn', labels.addItem);
  setText('generate-list-btn', labels.generateList);
  setText('filter-all', labels.filterAll);
  setText('filter-pending', labels.filterPending);
  setText('filter-completed', labels.filterCompleted);
  setText('shopping-empty', labels.shoppingEmpty);
  setText('nav-label-diet-desktop', labels.navDiet);
  setText('nav-label-diet-mobile', labels.navDiet);
  setText('nav-label-import-desktop', labels.navImport);
  setText('nav-label-import-mobile', labels.navImportMobile);
  setText('nav-label-shopping-desktop', labels.navShopping);
  setText('nav-label-shopping-mobile', labels.navShoppingMobile);
  setText('nav-label-assistant-desktop', labels.navAssistant);
  setText('nav-label-assistant-mobile', labels.navAssistantMobile);
}

// =====================
// Funciones de Utilidad
// =====================
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(date) {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getCurrentDayOfWeek() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

// =====================
// Autenticación
// =====================
async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    currentUser = session.user;
    showMainApp();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      showMainApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      showAuthModal();
    }
  });
}

function showAuthModal() {
  $('#auth-modal').classList.remove('hidden');
  $('#main-app').classList.add('hidden');
}

function showMainApp() {
  $('#auth-modal').classList.add('hidden');
  $('#main-app').classList.remove('hidden');

  const displayName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuario';
  $('#user-name').textContent = displayName;

  loadAllData();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $('#login-email').value;
  const password = $('#login-password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(error.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = $('#register-email').value;
  const password = $('#register-password').value;
  const fullName = $('#register-name').value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('¡Cuenta creada! Por favor, revisa tu correo para confirmar.', 'success');
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
}

function setupAuthForms() {
  $('#login-form').addEventListener('submit', handleLogin);
  $('#register-form').addEventListener('submit', handleRegister);
  $('#logout-btn').addEventListener('click', handleLogout);

  $('#show-register').addEventListener('click', (e) => {
    e.preventDefault();
    $('#login-form').classList.remove('active');
    $('#register-form').classList.add('active');
  });

  $('#show-login').addEventListener('click', (e) => {
    e.preventDefault();
    $('#register-form').classList.remove('active');
    $('#login-form').classList.add('active');
  });
}

// =====================
// Navegación
// =====================
function setupNavigation() {
  const mobileNavItems = $$('.mobile-nav-item');
  const desktopNavItems = $$('.desktop-nav-item');
  const sections = $$('.section');

  window.switchSection = function(sectionId) {
    mobileNavItems.forEach(nav => nav.classList.remove('active'));
    desktopNavItems.forEach(nav => nav.classList.remove('active'));

    mobileNavItems.forEach(nav => {
      if (nav.dataset.section === sectionId) {
        nav.classList.add('active');
      }
    });

    desktopNavItems.forEach(nav => {
      if (nav.dataset.section === sectionId) {
        nav.classList.add('active');
      }
    });

    sections.forEach(section => {
      section.classList.remove('active');
      if (section.id === `${sectionId}-section`) {
        section.classList.add('active');
      }
    });
  }

  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      window.switchSection(item.dataset.section);
    });
  });

  desktopNavItems.forEach(item => {
    item.addEventListener('click', () => {
      window.switchSection(item.dataset.section);
    });
  });

  // Acción rápida desde estado vacío
  $('#diet-empty-import-btn')?.addEventListener('click', () => {
    window.switchSection('import');
  });
}

// =====================
// Carga de Datos
// =====================
async function loadAllData() {
  await Promise.all([
    loadMeals(),
    loadShoppingItems(),
    loadPlanDocument()
  ]);

  updateDietView();
  renderShoppingList();
}

async function loadMeals() {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error cargando comidas:', error);
    showToast('Error cargando la dieta. Por favor, intenta de nuevo.', 'error');
    meals = [];
  } else if (data) {
    meals = data;
    // Detectar idioma desde los datos
    if (data.length > 0) {
      const lang = data[0].language;
      if (lang && DAY_LABELS[lang]) {
        currentLanguage = lang;
      } else {
        currentLanguage = detectLanguage(data.map(m => m.name + ' ' + (m.description || '')).join(' '));
      }
    }
  }
}

async function loadPlanDocument() {
  const { data } = await supabase
    .from('plan_documents')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  planDocument = data;
}

async function loadShoppingItems() {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando artículos:', error);
    shoppingItems = [];
  } else if (data) {
    shoppingItems = data;
  }
}

// =====================
// Mi Dieta (Vista Principal)
// =====================

// Canonical timing labels that nutritionists use as meal-section headers.
// When meal.name matches one of these, the badge shows the original label
// (e.g. "Media mañana") instead of the generic type (e.g. "Colación").
const MEAL_TIMING_LABELS = new Set([
  // Spanish
  'desayuno', 'media mañana', 'media manana', 'almuerzo', 'comida',
  'comida principal', 'merienda', 'cena', 'recena', 'colación', 'colacion',
  'tentempié', 'tentempie',
  'antes de entrenar', 'antes del entrenamiento', 'pre-entreno', 'pre entreno',
  'después de entrenar', 'despues de entrenar', 'post-entreno', 'post entreno',
  'después del entrenamiento', 'despues del entrenamiento',
  'antes de dormir',
  // English
  'breakfast', 'lunch', 'dinner', 'snack', 'morning snack', 'afternoon snack',
  'pre-workout', 'post-workout', 'bedtime snack',
  // Portuguese
  'café da manhã', 'cafe da manha', 'almoço', 'almoco', 'jantar', 'lanche',
  // French
  'petit déjeuner', 'petit dejeuner', 'déjeuner', 'dejeuner',
  'dîner', 'diner', 'goûter', 'gouter', 'collation',
  // German
  'frühstück', 'fruhstuck', 'mittagessen', 'abendessen',
  // Italian
  'colazione', 'pranzo', 'merenda', 'spuntino',
]);

function isMealTimingLabel(name) {
  if (!name) return false;
  return MEAL_TIMING_LABELS.has(name.toLowerCase().trim());
}

// Maps each meal's timing label (or meal_type fallback) to a numeric
// time-of-day slot so meals can be sorted chronologically within a day.
const TIMING_ORDER = {
  // Breakfast ~7 h
  'desayuno': 10, 'breakfast': 10,
  'café da manhã': 10, 'cafe da manha': 10,
  'petit déjeuner': 10, 'petit dejeuner': 10,
  'frühstück': 10, 'fruhstuck': 10,
  'colazione': 10,
  // Mid-morning ~10 h
  'media mañana': 20, 'media manana': 20,
  'morning snack': 20,
  // Lunch ~13 h
  'almuerzo': 30, 'comida': 30, 'comida principal': 30,
  'lunch': 30,
  'almoço': 30, 'almoco': 30,
  'déjeuner': 30, 'dejeuner': 30,
  'mittagessen': 30,
  'pranzo': 30,
  // Pre-workout ~15 h
  'antes de entrenar': 35, 'antes del entrenamiento': 35,
  'pre-entreno': 35, 'pre entreno': 35,
  'pre-workout': 35,
  // Afternoon snack ~17 h
  'merienda': 40, 'afternoon snack': 40,
  'lanche': 40,
  'goûter': 40, 'gouter': 40,
  'snack': 40,
  'merenda': 40,
  'colación': 40, 'colacion': 40,
  'tentempié': 40, 'tentempie': 40,
  'spuntino': 40,
  // Post-workout ~17:30 h
  'después de entrenar': 45, 'despues de entrenar': 45,
  'después del entrenamiento': 45, 'despues del entrenamiento': 45,
  'post-entreno': 45, 'post entreno': 45,
  'post-workout': 45,
  // Dinner ~20 h
  'cena': 50, 'dinner': 50,
  'jantar': 50,
  'dîner': 50, 'diner': 50,
  'abendessen': 50,
  // After dinner ~22 h
  'recena': 60, 'bedtime snack': 60,
  // Before sleep ~23 h
  'antes de dormir': 70,
};

const MEAL_TYPE_ORDER = { breakfast: 10, lunch: 30, dinner: 50, snack: 40 };

const OPTION_STRIP_RE = [
  /\s*[-–]\s*(opci[oó]n|option)\s*[A-Z0-9]/i,
  /\s*[-–]\s*[A-Z]$/,
  /\s*\(opci[oó]n\s*\d+\)$/i,
];

function chronologicalOrder(meal) {
  const base = OPTION_STRIP_RE
    .reduce((s, re) => s.replace(re, ''), meal.name || '')
    .trim()
    .toLowerCase();
  return TIMING_ORDER[base] ?? MEAL_TYPE_ORDER[meal.meal_type] ?? 40;
}

// Detects meals whose names are option variants (e.g. "Merienda - Opción A")
// and groups them so they render as a single visual block with labelled rows.
function groupOptionMeals(dayMeals) {
  const OPTION_RE   = /\s*[-–]\s*(opci[oó]n|option)\s*[A-Z0-9]/i;
  const LETTER_RE   = /\s*[-–]\s*[A-Z]$/;
  const NUM_PAREN_RE = /\s*\(opci[oó]n\s*\d+\)$/i;

  function isOption(name) {
    return OPTION_RE.test(name) || LETTER_RE.test(name) || NUM_PAREN_RE.test(name);
  }
  function getBase(name) {
    return name.replace(OPTION_RE, '').replace(LETTER_RE, '').replace(NUM_PAREN_RE, '').trim();
  }
  function getLabel(name) {
    const m = name.match(/[-–]\s*(.+)$/);
    return m ? m[1].trim() : name;
  }

  const groups = [];
  const visited = new Set();

  for (let i = 0; i < dayMeals.length; i++) {
    if (visited.has(i)) continue;
    const meal = dayMeals[i];
    if (!isOption(meal.name)) {
      groups.push({ type: 'single', meal });
      visited.add(i);
      continue;
    }
    const base = getBase(meal.name);
    const variants = [{ meal, label: getLabel(meal.name) }];
    visited.add(i);
    for (let j = i + 1; j < dayMeals.length; j++) {
      if (visited.has(j)) continue;
      const other = dayMeals[j];
      if (other.meal_type === meal.meal_type && isOption(other.name) && getBase(other.name) === base) {
        variants.push({ meal: other, label: getLabel(other.name) });
        visited.add(j);
      }
    }
    if (variants.length >= 2) {
      groups.push({ type: 'options', mealType: meal.meal_type, baseName: base, variants });
    } else {
      groups.push({ type: 'single', meal });
    }
  }
  return groups;
}

function updateDietView() {
  updateUILanguage();
  $('#current-date').textContent = formatDate(new Date());

  const emptyState = $('#diet-empty');
  const dietView   = $('#diet-view');
  const container  = $('#diet-days-grid');

  if (meals.length === 0) {
    emptyState.classList.remove('hidden');
    dietView.classList.add('hidden');
    $('#view-plan-document-btn')?.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  dietView.classList.remove('hidden');

  // Lazy-initialise to today
  if (currentViewDayIndex === -1) {
    const todayIdx = DAYS.indexOf(getCurrentDayOfWeek());
    currentViewDayIndex = todayIdx >= 0 ? todayIdx : 0;
  }

  const lang          = getLanguage();
  const dayLabels     = DAY_LABELS[lang]     || DAY_LABELS.en;
  const mealTypeLabels = MEAL_TYPE_LABELS[lang] || MEAL_TYPE_LABELS.en;
  const daysWithMeals = new Set(meals.map(m => m.day_of_week));

  const metaLabels = {
    es: `${meals.length} comidas esta semana (${daysWithMeals.size} días)`,
    en: `${meals.length} meals this week (${daysWithMeals.size} days)`,
    pt: `${meals.length} refeições esta semana (${daysWithMeals.size} dias)`,
    fr: `${meals.length} repas cette semaine (${daysWithMeals.size} jours)`,
    de: `${meals.length} Mahlzeiten diese Woche (${daysWithMeals.size} Tage)`,
    it: `${meals.length} pasti questa settimana (${daysWithMeals.size} giorni)`,
    nl: `${meals.length} maaltijden deze week (${daysWithMeals.size} dagen)`
  };
  $('#diet-view-meta').textContent = metaLabels[lang] || metaLabels.en;

  const viewDocBtn = $('#view-plan-document-btn');
  if (viewDocBtn) {
    if (planDocument?.storage_path) {
      viewDocBtn.classList.remove('hidden');
    } else {
      viewDocBtn.classList.add('hidden');
    }
  }

  const mealsByDay = {};
  DAYS.forEach(day => { mealsByDay[day] = []; });
  meals.forEach(meal => {
    if (mealsByDay[meal.day_of_week]) mealsByDay[meal.day_of_week].push(meal);
  });

  const mealIcons  = { breakfast: '🌅', lunch: '🌞', dinner: '🌙', snack: '🥑' };
  const emptyTexts = {
    es: 'Sin comidas planificadas',
    en: 'No meals planned',
    pt: 'Sem refeições planificadas',
    fr: 'Aucun repas planifié',
    de: 'Keine Mahlzeiten geplant',
    it: 'Nessun pasto pianificato',
    nl: 'Geen maaltijden gepland'
  };

  const todayDOW   = getCurrentDayOfWeek();
  const currentDay = DAYS[currentViewDayIndex];
  const isToday    = currentDay === todayDOW;
  const dayMeals   = (mealsByDay[currentDay] || []).slice().sort((a, b) => {
    const diff = chronologicalOrder(a) - chronologicalOrder(b);
    if (diff !== 0) return diff;
    return (a.display_order ?? Infinity) - (b.display_order ?? Infinity);
  });
  const mealCount  = dayMeals.length;
  const prevIdx    = (currentViewDayIndex - 1 + 7) % 7;
  const nextIdx    = (currentViewDayIndex + 1) % 7;

  const EDIT_ICON   = `<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`;
  const DELETE_ICON = `<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
  const PREV_ICON   = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
  const NEXT_ICON   = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`;

  function renderIngredients(meal) {
    if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
      return `<ul class="preview-ingredients">${meal.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>`;
    }
    // Avoid repeating the timing label — the badge already shows it
    if (isMealTimingLabel(meal.name)) return '';
    return `<div class="meal-name">${meal.name}${meal.description ? `<div class="meal-description">${meal.description}</div>` : ''}</div>`;
  }

  function renderActions(meal) {
    return `<div class="meal-actions">
      <button class="meal-action-btn" onclick="window.editMeal('${meal.id}')" title="Editar">${EDIT_ICON}</button>
      <button class="meal-action-btn danger" onclick="window.deleteMealItem('${meal.id}')" title="Eliminar">${DELETE_ICON}</button>
    </div>`;
  }

  const groups   = groupOptionMeals(dayMeals);
  const emptySlot = `<div class="diet-meal empty-slot">${emptyTexts[lang] || emptyTexts.en}</div>`;

  const mealsList = groups.length === 0 ? emptySlot : groups.map(group => {
    if (group.type === 'single') {
      const { meal } = group;
      const typeLabel = isMealTimingLabel(meal.name)
        ? meal.name
        : (mealTypeLabels[meal.meal_type] || meal.meal_type);
      return `<div class="diet-meal">
        <div class="meal-header">
          <span class="meal-type ${meal.meal_type}">${mealIcons[meal.meal_type]} ${typeLabel}</span>
          ${renderActions(meal)}
        </div>
        ${renderIngredients(meal)}
      </div>`;
    }
    // Options group — use the base timing label if recognisable
    const typeLabel = isMealTimingLabel(group.baseName)
      ? group.baseName
      : (mealTypeLabels[group.mealType] || group.mealType);
    return `<div class="diet-meal meal-options-group">
      <div class="meal-header">
        <span class="meal-type ${group.mealType}">${mealIcons[group.mealType]} ${typeLabel}</span>
        <span class="options-badge">${group.variants.length} opciones</span>
      </div>
      <div class="meal-options-list">
        ${group.variants.map(({ meal, label }) => `
          <div class="meal-option-item">
            <div class="meal-option-header">
              <span class="meal-option-label">${label}</span>
              ${renderActions(meal)}
            </div>
            ${renderIngredients(meal)}
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="day-navigator">
      <button class="day-nav-btn" onclick="window.prevViewDay()">
        ${PREV_ICON}<span class="day-nav-adjacent">${dayLabels[DAYS[prevIdx]]}</span>
      </button>
      <div class="day-nav-center">
        <h3 class="day-nav-label">${dayLabels[currentDay]}</h3>
        ${isToday ? '<span class="day-today-badge">Hoy</span>' : ''}
        <span class="day-meal-count">${mealCount} comida${mealCount !== 1 ? 's' : ''}</span>
      </div>
      <button class="day-nav-btn" onclick="window.nextViewDay()">
        <span class="day-nav-adjacent">${dayLabels[DAYS[nextIdx]]}</span>${NEXT_ICON}
      </button>
    </div>
    <div class="diet-day-single${isToday ? ' today' : ''}">
      <div class="diet-meals">
        ${mealsList}
      </div>
      <div class="diet-day-footer">
        <button class="add-meal-day-btn" onclick="window.addMealToDay('${currentDay}')">+ Añadir comida</button>
      </div>
    </div>
  `;
}

// =====================
// Modal de Comida
// =====================
// Gestión manual de comidas eliminada - la aplicación es un organizador de dieta, no un rastreador de comidas
function setupMealModal() {
  // No-op: la edición manual de comidas no está soportada
}

// =====================
// Lista de la Compra
// =====================
function renderShoppingList(filter = 'all') {
  const container = $('#shopping-list');
  let filteredItems = shoppingItems;

  if (filter === 'pending') {
    filteredItems = shoppingItems.filter(item => !item.completed);
  } else if (filter === 'completed') {
    filteredItems = shoppingItems.filter(item => item.completed);
  }

  if (filteredItems.length === 0) {
    const lang = getLanguage();
    const labels = UI_LABELS[lang] || UI_LABELS.en;
    container.innerHTML = `<p class="empty-state" id="shopping-empty">${labels.shoppingEmpty}</p>`;
    return;
  }

  const lang = getLanguage();
  const labels = UI_LABELS[lang] || UI_LABELS.en;

  container.innerHTML = filteredItems.map(item => `
    <div class="shopping-item ${item.completed ? 'completed' : ''} ${item.is_custom ? 'custom' : ''}">
      <div class="item-info">
        <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="window.toggleShoppingItem('${item.id}', this.checked)">
        <div class="item-details">
          <span class="item-name">${item.name}</span>
          <span class="item-quantity">${item.quantity ?? ''}</span>
          ${item.is_custom ? '<span class="item-badge custom">Personalizado</span>' : '<span class="item-badge auto">Generado</span>'}
        </div>
      </div>
      <button class="item-delete-btn" onclick="window.deleteShoppingItem('${item.id}')" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

function setupShoppingList() {
  const filters = $$('.filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      renderShoppingList(btn.dataset.filter);
    });
  });

  $('#generate-list-btn').addEventListener('click', generateShoppingList);
  $('#clear-list-btn').addEventListener('click', clearGeneratedShoppingItems);
  $('#add-item-btn').addEventListener('click', () => {
    $('#item-modal').classList.remove('hidden');
  });

  window.toggleShoppingItem = async (id, completed) => {
    const { error } = await supabase
      .from('shopping_items')
      .update({ completed })
      .eq('id', id);

    if (!error) {
      await loadShoppingItems();
      const activeFilter = $('.filter-btn.active')?.dataset.filter || 'all';
      renderShoppingList(activeFilter);
    }
  };

  window.deleteShoppingItem = async (id) => {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (!error) {
      showToast('Artículo eliminado', 'success');
      await loadShoppingItems();
      const activeFilter = $('.filter-btn.active')?.dataset.filter || 'all';
      renderShoppingList(activeFilter);
    }
  };
}

// =====================
// Extracción de ingredientes para la lista de la compra
// =====================

const COOKING_METHOD_PATTERNS = [
  'a la plancha', 'al horno', 'al vapor', 'al microondas',
  'a la brasa', 'a la parrilla', 'a la cazuela', 'en papillote',
  'en su jugo', 'a fuego lento',
  'al curry', 'al ajillo', 'al pil pil', 'a la romana',
  'con salsa verde', 'con salsa', 'en salsa', 'a la vinagreta',
  'con especias', 'con hierbas aromáticas', 'con hierbas',
  'hervido', 'hervida', 'hervidos', 'hervidas',
  'frito', 'frita', 'fritos', 'fritas',
  'asado', 'asada', 'asados', 'asadas',
  'estofado', 'estofada', 'estofados', 'estofadas',
  'guisado', 'guisada', 'guisados', 'guisadas',
  'salteado', 'salteada', 'salteados', 'salteadas',
  'marinado', 'marinada', 'marinados', 'marinadas',
  'ahumado', 'ahumada', 'ahumados', 'ahumadas',
  'gratinado', 'gratinada', 'gratinados', 'gratinadas',
  'rebozado', 'rebozada', 'rebozados', 'rebozadas',
  'empanado', 'empanada', 'empanados', 'empanadas',
  'cocido', 'cocida', 'cocidos', 'cocidas',
].sort((a, b) => b.length - a.length);

const PROTECTED_PRODUCTS = [
  'aceite de oliva virgen extra', 'aceite de oliva', 'aceite de girasol',
  'leche de almendras', 'leche de avena', 'leche de soja', 'leche de coco',
  'crema de cacahuete', 'crema de almendras',
  'proteína de suero', 'proteína en polvo',
  'atún al natural', 'atún en conserva',
  'sardinas en conserva', 'caballa en conserva',
  'jamón cocido', 'jamón serrano', 'jamón ibérico',
  'pavo en lonchas', 'pavo cocido',
  'queso fresco', 'queso cottage', 'queso rallado', 'queso de cabra', 'queso manchego',
  'yogur natural', 'yogur griego', 'yogur de soja',
  'pan integral', 'pan de molde', 'pan de centeno', 'pan de avena',
  'tortitas de arroz', 'tortitas de maíz',
  'bebida vegetal',
  'hummus', 'tofu', 'tempeh', 'seitán',
].sort((a, b) => b.length - a.length);

const RECIPE_EXPANSIONS = {
  'tortilla española': ['Huevos', 'Patata', 'Cebolla', 'Aceite de oliva'],
  'tortilla de patatas': ['Huevos', 'Patata', 'Cebolla', 'Aceite de oliva'],
  'tortilla de claras': ['Claras de huevo'],
  'revuelto de claras': ['Claras de huevo'],
  'ensalada mixta': ['Lechuga', 'Tomate', 'Cebolla'],
  'ensalada verde': ['Lechuga', 'Pepino', 'Cebolla'],
  'ensalada caprese': ['Tomate', 'Mozzarella', 'Albahaca'],
};

const RECIPE_PREFIXES = [
  'revuelto de', 'revuelta de',
  'ensalada de',
  'crema de', 'sopa de', 'puré de', 'pure de',
  'tortilla de',
  'salteado de', 'salteada de',
  'guiso de', 'estofado de',
  'bowl de', 'wrap de', 'wok de',
].sort((a, b) => b.length - a.length);

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Normalizes an ingredient name to a stable grouping key.
// Lowercases, strips diacritics, and trims so that "Salmón" and "Salmon"
// (or any accent variation) map to the same key and are merged correctly.
function normalizeIngredientKey(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[.,;:!?]+$/, '')  // strip trailing punctuation left by parsers
    .trim();                    // re-trim in case punctuation had surrounding spaces
}

function stripCookingMethod(text) {
  let result = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const method of COOKING_METHOD_PATTERNS) {
      const escaped = method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:,\\s*|\\s+)${escaped}\\s*$`, 'i');
      const next = result.replace(regex, '').trim();
      if (next !== result && next.length > 0) {
        result = next;
        changed = true;
        break;
      }
    }
  }
  return result;
}

function extractQtyAndName(text) {
  // Range notation like "3-4" or "2-3g": the range is an imprecise amount, so
  // we keep the ingredient name and emit qty=null (mergeShoppingIngredients will
  // count occurrences instead of summing a wrong number).
  const rangeM = text.match(/^(\d+(?:[.,]\d+)?)-(\d+(?:[.,]\d+)?)\s*(g|gr|kg|ml|l|cl|dl)?\s*(?:de\s+)?/i);
  if (rangeM && rangeM[0].length < text.length) {
    return { qty: null, name: text.slice(rangeM[0].length).trim() };
  }
  const m = text.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|kg|ml|l|cl|dl)?\s*(?:de\s+)?/i);
  if (m && m[0].length < text.length) {
    const value = m[1];
    const unit = m[2] ? m[2].toLowerCase().replace('gr', 'g') : '';
    return {
      qty: unit ? `${value}${unit}` : value,
      name: text.slice(m[0].length).trim()
    };
  }
  return { qty: null, name: text.trim() };
}

function extractShoppingIngredients(raw) {
  if (!raw || !raw.trim()) return [];
  // Strip leading bullet characters that the parser may not have caught when
  // there is no space between the bullet and the content (e.g. "-4 almendras")
  const trimmed = raw.trim().replace(/^[-•*]\s*/, '');
  const lower = trimmed.toLowerCase();

  for (const p of PROTECTED_PRODUCTS) {
    if (lower === p || lower.startsWith(p + ' ') || lower.startsWith(p + ',')) {
      return [{ name: capitalize(p), qty: null }];
    }
  }

  for (const [recipe, ingredients] of Object.entries(RECIPE_EXPANSIONS)) {
    if (lower === recipe || lower.startsWith(recipe + ' con ') || lower.startsWith(recipe + ' y ')) {
      const extraStr = lower.slice(recipe.length).replace(/^\s*(con|y)\s*/i, '').trim();
      const result = ingredients.map(i => ({ name: i, qty: null }));
      if (extraStr) {
        extraStr.split(/\s+(?:con|y)\s+/i).forEach(e => {
          const cleaned = stripCookingMethod(e.trim());
          if (cleaned) result.push({ name: capitalize(cleaned), qty: null });
        });
      }
      return result;
    }
  }

  const { qty, name: nameStr } = extractQtyAndName(trimmed);
  const lowerName = nameStr.toLowerCase();

  for (const prefix of RECIPE_PREFIXES) {
    if (lowerName.startsWith(prefix)) {
      const remainder = nameStr.slice(prefix.length).trim();
      const parts = remainder.split(/\s+(?:con|y)\s+/i)
        .map(p => stripCookingMethod(p.trim()))
        .filter(Boolean);
      if (parts.length > 0) return parts.map(p => ({ name: capitalize(p), qty: null }));
    }
  }

  if (/\s+con\s+/i.test(nameStr)) {
    const conParts = nameStr.split(/\s+con\s+/i);
    if (conParts.length > 1) {
      const result = [];
      for (const cp of conParts) {
        // Each part produced by "con" may itself be "X y Y" — split further
        // so compound right-hand expressions yield individual ingredients.
        for (const yp of cp.split(/\s+y\s+/i)) {
          const cleaned = stripCookingMethod(yp.trim());
          if (cleaned) result.push({ name: capitalize(cleaned), qty: null });
        }
      }
      return result;
    }
  }

  const cleanName = stripCookingMethod(nameStr);
  return cleanName ? [{ name: capitalize(cleanName), qty }] : [];
}

function mergeShoppingIngredients(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = normalizeIngredientKey(item.name);
    if (!grouped.has(key)) grouped.set(key, { name: item.name, qtys: [] });
    grouped.get(key).qtys.push(item.qty);
  }

  const result = [];
  for (const [, data] of grouped) {
    const qtys = data.qtys.filter(Boolean);
    let quantity;

    if (qtys.length === 0) {
      // No quantity info at all — show count only when more than one occurrence
      const count = data.qtys.length;
      quantity = count > 1 ? `${count}x` : null;
    } else {
      const parsed = qtys.map(q => {
        const m = q.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl|dl)?$/i);
        if (!m) return null;
        const value = parseFloat(m[1].replace(',', '.'));
        if (!isFinite(value) || value < 0) return null;
        return { value, unit: (m[2] || '').toLowerCase().replace('gr', 'g') };
      }).filter(Boolean);

      if (parsed.length === qtys.length && parsed.length > 0) {
        const units = [...new Set(parsed.map(p => p.unit))];
        if (units.length === 1) {
          const total = Math.round(parsed.reduce((s, p) => s + p.value, 0) * 1000) / 1000;
          if (total > 0) {
            quantity = units[0]
              ? `${total}${units[0]}`
              : `${Math.round(total)}`;
          } else {
            quantity = null;
          }
        } else {
          // Incompatible units — drop quantity to avoid incorrect values
          quantity = null;
        }
      } else {
        // Some entries unparseable — use first valid raw value if positive
        const firstValid = qtys.find(q => {
          const m = q.match(/^(\d+(?:[.,]\d+)?)/);
          return m && parseFloat(m[1]) > 0;
        });
        quantity = firstValid ?? null;
      }
    }

    result.push({ name: data.name, quantity });
  }

  return result;
}

function collectShoppingIngredients(mealsArray) {
  const allItems = [];
  for (const meal of mealsArray) {
    const sources = (meal.ingredients && meal.ingredients.length > 0)
      ? meal.ingredients
      : (meal.name ? [meal.name] : []);
    for (const src of sources) {
      allItems.push(...extractShoppingIngredients(src));
    }
  }
  return mergeShoppingIngredients(allItems);
}

async function clearGeneratedShoppingItems() {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('is_custom', false);

  if (error) {
    showToast('Error al limpiar la lista', 'error');
    return;
  }

  showToast('Lista generada vaciada', 'success');
  await loadShoppingItems();
  const activeFilter = $('.filter-btn.active')?.dataset.filter || 'all';
  renderShoppingList(activeFilter);
}

// Calls the shopping-normalizer edge function to collapse semantic duplicates
// (e.g. "Fruta" + "Fruta a elegir (...)"). Falls back silently on any error.
// Both the edge function and this function enforce that canonical names must
// already exist in the input — no new names are ever invented.
async function semanticNormalizeShopping(merged) {
  if (merged.length < 2) return merged;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/shopping-normalizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ items: merged }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return merged;

    const data = await response.json();
    if (!data || typeof data.merges !== 'object' || Array.isArray(data.merges)) return merged;

    const nameSet = new Set(merged.map(i => i.name));
    const renames = {};
    for (const [from, to] of Object.entries(data.merges)) {
      if (typeof to !== 'string') continue;
      if (!nameSet.has(from) || !nameSet.has(to) || from === to) continue;
      renames[from] = to;
    }

    if (Object.keys(renames).length === 0) return merged;

    // Apply renames and collapse newly-identical entries.
    // When two items share a canonical name, keep the first and fill in a
    // missing quantity from the second (prefer non-null over null).
    const seen = new Map();
    for (const item of merged) {
      const canonical = renames[item.name] ?? item.name;
      const key = normalizeIngredientKey(canonical);
      if (!seen.has(key)) {
        seen.set(key, { name: canonical, quantity: item.quantity });
      } else {
        const existing = seen.get(key);
        if (!existing.quantity && item.quantity) existing.quantity = item.quantity;
      }
    }
    return [...seen.values()];
  } catch {
    return merged;
  }
}

async function generateShoppingList() {
  // Always delete previously generated items first to prevent stale data
  const { error: deleteError } = await supabase
    .from('shopping_items')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('is_custom', false);

  if (deleteError) {
    showToast('Error al actualizar la lista', 'error');
    return;
  }

  shoppingItems = shoppingItems.filter(i => i.is_custom);

  // Step 1: deterministic extraction and dedup
  const deterministic = collectShoppingIngredients(meals);

  // Step 2: AI semantic normalization — non-blocking, falls back silently
  const merged = await semanticNormalizeShopping(deterministic);

  const existingCustomNames = new Set(shoppingItems.map(i => normalizeIngredientKey(i.name)));
  const newItems = merged
    .filter(item => !existingCustomNames.has(normalizeIngredientKey(item.name)))
    .map(item => ({
      user_id: currentUser.id,
      name: item.name,
      quantity: item.quantity ?? null,
      completed: false,
      is_custom: false
    }));

  if (newItems.length === 0) {
    showToast('No se encontraron ingredientes en el plan de comidas', 'info');
    await loadShoppingItems();
    renderShoppingList();
    return;
  }

  const { error } = await supabase
    .from('shopping_items')
    .insert(newItems);

  if (error) {
    showToast('Error al generar la lista', 'error');
  } else {
    showToast(`Lista actualizada con ${newItems.length} artículos`, 'success');
    await loadShoppingItems();
    renderShoppingList();
  }
}

// =====================
// Modal de Artículo
// =====================
function setupItemModal() {
  const modal = $('#item-modal');
  const form = $('#item-form');

  $$('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  $('.modal-overlay', modal)?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from('shopping_items')
      .insert({
        user_id: currentUser.id,
        name: $('#item-name').value,
        quantity: $('#item-quantity').value || '1',
        completed: false,
        is_custom: true
      });

    if (error) {
      showToast('Error al añadir el artículo', 'error');
    } else {
      showToast('¡Artículo añadido!', 'success');
      modal.classList.add('hidden');
      form.reset();
      await loadShoppingItems();
      renderShoppingList();
    }
  });
}

// =====================
// Asistente de Sustitutos
// =====================
const FOOD_SUBSTITUTES = {
  mantequilla: [
    { name: 'Aceite de Oliva', ratio: '3/4 taza por 1 taza de mantequilla', notes: 'Excelente para cocinar, añade grasas saludables' },
    { name: 'Yogur Griego', ratio: '1/2 taza por 1 taza de mantequilla', notes: 'Menos calorías, mayor contenido de proteínas' },
    { name: 'Salsa de Manzana', ratio: '1/2 taza por 1 taza de mantequilla', notes: 'Mejor para hornear, reduce grasas' },
    { name: 'Aguacate', ratio: '1 taza triturada por 1 taza de mantequilla', notes: 'Rico en grasas monoinsaturadas saludables' },
    { name: 'Aceite de Coco', ratio: 'Proporción 1:1', notes: 'Bueno para hornear, añade sabor ligero a coco' }
  ],
  azúcar: [
    { name: 'Stevia', ratio: '1 cucharadita por 1 taza de azúcar', notes: 'Sin calorías, edulcorante natural' },
    { name: 'Miel', ratio: '3/4 taza por 1 taza de azúcar', notes: 'Natural, reduce el líquido en la receta en 1/4' },
    { name: 'Sirope de Arce', ratio: '3/4 taza por 1 taza de azúcar', notes: 'Alternativa natural con antioxidantes' },
    { name: 'Salsa de Manzana', ratio: '1 taza por 1 taza de azúcar', notes: 'Reduce calorías, añade humedad' },
    { name: 'Fruta del Monje', ratio: '3/4 taza por 1 taza de azúcar', notes: 'Edulcorante natural sin calorías' }
  ],
  leche: [
    { name: 'Leche de Almendras', ratio: 'Proporción 1:1', notes: 'Menos calorías, alternativa sin lácteos' },
    { name: 'Leche de Avena', ratio: 'Proporción 1:1', notes: 'Textura cremosa, buena para café y hornear' },
    { name: 'Leche de Coco', ratio: 'Proporción 1:1', notes: 'Rica y cremosa, mayor contenido de grasa' },
    { name: 'Leche de Soja', ratio: 'Proporción 1:1', notes: 'Contenido de proteínas similar al lácteo' },
    { name: 'Yogur Griego', ratio: '3/4 taza + 1/4 taza de agua', notes: 'Mayor proteínas, sabor ácido' }
  ],
  huevos: [
    { name: 'Huevo de Lino', ratio: '1 cda lino molido + 3 cda agua', notes: 'Mejor para hornear, añade omega-3' },
    { name: 'Huevo de Chía', ratio: '1 cda semillas de chía + 3 cda agua', notes: 'Similar al lino, añade fibra' },
    { name: 'Salsa de Manzana', ratio: '1/4 taza por huevo', notes: 'Reduce grasa, funciona en hornear' },
    { name: 'Plátano', ratio: '1/2 plátano triturado por huevo', notes: 'Añade dulzura y humedad' },
    { name: 'Tofu Sedoso', ratio: '1/4 taza batido por huevo', notes: 'Alta proteína, sabor neutro' }
  ],
  harina: [
    { name: 'Harina de Almendras', ratio: 'Proporción 1:1', notes: 'Sin gluten, bajo carbohidrato, sabor a nuez' },
    { name: 'Harina de Avena', ratio: 'Proporción 1:1', notes: 'Hecha de avena molida, más fibra' },
    { name: 'Harina de Coco', ratio: '1/4 taza por 1 taza de harina', notes: 'Absorbe más líquido, sin gluten' },
    { name: 'Harina de Trigo Integral', ratio: 'Proporción 1:1', notes: 'Más fibra y nutrientes que la harina blanca' },
    { name: 'Harina de Garbanzo', ratio: 'Proporción 1:1', notes: 'Alta proteína, alternativa sin gluten' }
  ],
  nata: [
    { name: 'Nata de Coco', ratio: 'Proporción 1:1', notes: 'Sin lácteos, rica y cremosa' },
    { name: 'Nata de Anacardos', ratio: 'Proporción 1:1', notes: 'Hecha de anacardos remojados, versátil' },
    { name: 'Tofu Sedoso', ratio: 'Batido con agua', notes: 'Menos grasa, mayor opción de proteínas' },
    { name: 'Yogur Griego', ratio: 'Sustituir directamente', notes: 'Ácido, alta proteína' }
  ],
  mayonesa: [
    { name: 'Yogur Griego', ratio: 'Proporción 1:1', notes: 'Menos calorías, mayor proteína' },
    { name: 'Aguacate', ratio: 'Aguacate triturado', notes: 'Grasas saludables, textura cremosa' },
    { name: 'Hummus', ratio: 'Proporción 1:1', notes: 'Añade sabor y fibra' },
    { name: 'Aceite de Oliva', ratio: 'Usar en aliños', notes: 'Grasa saludable para vinagretas' }
  ],
  pan_rallado: [
    { name: 'Almendras Trituradas', ratio: 'Proporción 1:1', notes: 'Bajo carbohidrato, textura crujiente' },
    { name: 'Avena', ratio: 'Proporción 1:1', notes: 'Grano integral, rica en fibra' },
    { name: 'Galletas Trituradas', ratio: 'Proporción 1:1', notes: 'Textura similar, varios sabores' },
    { name: 'Queso Parmesano', ratio: 'Proporción 1:1', notes: 'Bajo carbohidrato, añade sabor' }
  ],
  arroz: [
    { name: 'Arroz de Coliflor', ratio: 'Proporción 1:1', notes: 'Bajo carbohidrato, menos calorías' },
    { name: 'Quinoa', ratio: 'Proporción 1:1', notes: 'Proteína completa, más fibra' },
    { name: 'Arroz Integral', ratio: 'Proporción 1:1', notes: 'Más fibra y nutrientes que el arroz blanco' },
    { name: 'Farro', ratio: 'Proporción 1:1', notes: 'Sabor a nuez, alto contenido de fibra' }
  ],
  pasta: [
    { name: 'Fideos de Calabacín', ratio: 'Proporción 1:1', notes: 'Muy bajo en calorías, sin gluten' },
    { name: 'Calabaza Espagueti', ratio: 'Proporción 1:1', notes: 'Textura natural de fideos, bajo carbohidrato' },
    { name: 'Pasta de Garbanzo', ratio: 'Proporción 1:1', notes: 'Mayor proteína y fibra' },
    { name: 'Pasta de Lentejas', ratio: 'Proporción 1:1', notes: 'Alta proteína, sin gluten' }
  ],
  aceite: [
    { name: 'Salsa de Manzana', ratio: '1/2 taza por 1/2 taza de aceite', notes: 'Reduce grasa y calorías' },
    { name: 'Yogur Griego', ratio: '3/4 de la cantidad', notes: 'Funciona en hornear, añade proteínas' },
    { name: 'Plátano Triturado', ratio: '1/2 taza por 1/2 taza de aceite', notes: 'Dulzura natural, humedad' },
    { name: 'Puré de Calabaza', ratio: 'Proporción 1:1', notes: 'Añade nutrientes y humedad' }
  ]
};

function getSubstitutes(ingredient) {
  const normalizedIngredient = ingredient.toLowerCase().trim();

  for (const [key, subs] of Object.entries(FOOD_SUBSTITUTES)) {
    if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
      return { ingredient: key.charAt(0).toUpperCase() + key.slice(1), substitutes: subs };
    }
  }

  return null;
}

function setupAssistant() {
  const input = $('#ingredient-input');
  const searchBtn = $('#search-substitute-btn');

  searchBtn.addEventListener('click', () => {
    const ingredient = input.value.trim();
    if (!ingredient) {
      showToast('Por favor, introduce un ingrediente', 'error');
      return;
    }

    showSubstitutes(ingredient);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchBtn.click();
    }
  });

  $$('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ingredient = chip.dataset.ingredient;
      input.value = ingredient;
      showSubstitutes(ingredient);
    });
  });
}

function renderSubstitutes(result) {
  $('#substitute-title').textContent = `Alternativas para ${result.ingredient}`;
  $('#substitutes-list').innerHTML = result.substitutes.map(sub => `
    <div class="substitute-card">
      <h4 class="substitute-name">${sub.name}</h4>
      <p class="substitute-ratio">${sub.ratio}</p>
      <p class="substitute-notes">${sub.notes}</p>
    </div>
  `).join('');
  $('#substitute-results').classList.remove('hidden');
  $('#assistant-placeholder').classList.add('hidden');
}

async function showSubstitutes(ingredient) {
  const btn = $('#search-substitute-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Buscando…';

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ ingredient }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.ingredient || !Array.isArray(result.substitutes)) throw new Error('Invalid response');

    renderSubstitutes(result);
  } catch {
    const fallback = getSubstitutes(ingredient);
    if (!fallback) {
      showToast(`No se encontraron sustitutos para "${ingredient}". Prueba: mantequilla, azúcar, leche, huevos o harina.`, 'info');
    } else {
      renderSubstitutes(fallback);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// =====================
// Importar Dieta (Multilingüe)
// =====================
let parsedMeals = [];
let parsedPlan = null;
const parseLog = [];

function logParse(level, message) {
  const entry = { level, message, time: new Date().toISOString() };
  parseLog.push(entry);
  if (level === 'error') {
    console.error(`[AnalizadorDieta] ${message}`);
  } else if (level === 'warn') {
    console.warn(`[AnalizadorDieta] ${message}`);
  } else {
    console.log(`[AnalizadorDieta] ${message}`);
  }
}

// Reads a File object and returns its base64-encoded content (without the data-URL prefix).
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

// Calls the diet-parser edge function with either text or a file.
// Times out after 90 s — gemini-2.5-flash with extended thinking can take 60+ s.
async function callDietParser(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  const url = `${SUPABASE_URL}/functions/v1/diet-parser`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    if (!Array.isArray(data.meals)) {
      throw new Error('Respuesta inesperada del servicio IA');
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

const MULTILANG_DAYS = {
  'monday': {
    en: ['monday', 'mon'],
    es: ['lunes', 'lu'],
    pt: ['segunda-feira', 'segunda', 'seg'],
    fr: ['lundi', 'lun'],
    de: ['montag', 'mo'],
    it: ['lunedì', 'lunedi'],
    nl: ['maandag', 'ma'],
  },
  'tuesday': {
    en: ['tuesday', 'tue', 'tues'],
    es: ['martes'],
    pt: ['terça-feira', 'terça', 'terca', 'ter'],
    fr: ['mardi'],
    de: ['dienstag', 'di'],
    it: ['martedì', 'martedi'],
    nl: ['dinsdag', 'di'],
  },
  'wednesday': {
    en: ['wednesday', 'wed'],
    es: ['miércoles', 'miercoles'],
    pt: ['quarta-feira', 'quarta', 'qua'],
    fr: ['mercredi', 'mer'],
    de: ['mittwoch', 'mi'],
    it: ['mercoledì', 'mercoledi'],
    nl: ['woensdag', 'wo'],
  },
  'thursday': {
    en: ['thursday', 'thu', 'thurs'],
    es: ['jueves'],
    pt: ['quinta-feira', 'quinta', 'qui'],
    fr: ['jeudi'],
    de: ['donnerstag', 'do'],
    it: ['giovedì', 'giovedi'],
    nl: ['donderdag', 'do'],
  },
  'friday': {
    en: ['friday', 'fri'],
    es: ['viernes'],
    pt: ['sexta-feira', 'sexta', 'sex'],
    fr: ['vendredi'],
    de: ['freitag', 'fr'],
    it: ['venerdì', 'venerdi'],
    nl: ['vrijdag', 'vr'],
  },
  'saturday': {
    en: ['saturday', 'sat'],
    es: ['sábado', 'sabado'],
    pt: ['sábado', 'sabado'],
    fr: ['samedi', 'sam'],
    de: ['samstag', 'sa'],
    it: ['sabato'],
    nl: ['zaterdag', 'za'],
  },
  'sunday': {
    en: ['sunday', 'sun'],
    es: ['domingo', 'dom'],
    pt: ['domingo'],
    fr: ['dimanche', 'dim'],
    de: ['sonntag', 'so'],
    it: ['domenica'],
    nl: ['zondag', 'zo'],
  }
};

const MULTILANG_MEAL_TYPES = {
  'breakfast': {
    en: ['breakfast', 'break fast', 'morning meal', 'morning'],
    es: ['desayuno', 'desayuno:', 'almuerzo temprano'],
    pt: ['café da manhã', 'cafe da manha', 'café da manha', 'desjejum', 'pequeno almoço', 'pequeno almoco'],
    fr: ['petit déjeuner', 'petit dejeuner', 'déjeuner'],
    de: ['frühstück', 'fruhstuck'],
    it: ['colazione'],
    nl: ['ontbijt'],
  },
  'morning_snack': {
    en: ['morning snack', 'mid-morning', 'mid morning', 'morning break', 'media mañana'],
    es: ['media mañana', 'media manana', 'colación de la mañana', 'colacion de la manana', 'merienda de la mañana'],
    pt: ['lanche da manhã', 'lanche da manha'],
    fr: ['collation du matin'],
    de: ['vormittagssnack', 'zweites frühstück'],
    it: ['spuntino del mattino'],
    nl: ['tussendoortje', 'ochtendtussendoortje'],
  },
  'lunch': {
    en: ['lunch', 'noon meal', 'noon'],
    es: ['almuerzo', 'almuerzo:', 'comida'],
    pt: ['almoço', 'almoco'],
    fr: ['déjeuner', 'dejeuner'],
    de: ['mittagessen', 'mittag'],
    it: ['pranzo'],
    nl: ['lunch'],
  },
  'afternoon_snack': {
    en: ['afternoon snack', 'afternoon break', 'tea time', 'tea', 'merienda'],
    es: ['merienda', 'colación', 'colacion', 'media tarde', 'tentempié'],
    pt: ['lanche da tarde', 'lanche'],
    fr: ['goûter', 'gouter', 'collation'],
    de: ['nachmittagssnack'],
    it: ['merenda', 'spuntino del pomeriggio'],
    nl: ['tussendoortje', 'middagtussendoortje'],
  },
  'dinner': {
    en: ['dinner', 'evening meal', 'evening', 'supper'],
    es: ['cena', 'cena:', 'comida nocturna'],
    pt: ['jantar', 'ceia'],
    fr: ['dîner', 'diner', 'souper'],
    de: ['abendessen', 'abendbrot'],
    it: ['cena'],
    nl: ['diner', 'avondeten'],
  },
  'snack': {
    en: ['snack', 'collation', 'bite'],
    es: ['colación', 'colacion', 'tentempié', 'tentempie', 'picoteo'],
    pt: ['lanche', 'colação', 'colacion'],
    fr: ['collation', 'encas'],
    de: ['snack', 'jause', 'imbiss'],
    it: ['spuntino', 'merenda'],
    nl: ['tussendoortje', 'snack'],
  }
};

const MEAL_TYPE_MAPPING = {
  'morning_snack': 'snack',
  'afternoon_snack': 'snack'
};

function getCanonicalMealType(type) {
  return MEAL_TYPE_MAPPING[type] || type;
}

function detectLanguage(text) {
  const lowerText = text.toLowerCase();
  const langScores = {};

  for (const [lang, dayNames] of Object.entries(Object.values(MULTILANG_DAYS)[0])) {
    langScores[lang] = 0;
  }

  for (const dayEntry of Object.values(MULTILANG_DAYS)) {
    for (const [lang, names] of Object.entries(dayEntry)) {
      for (const name of names) {
        if (lowerText.includes(name.toLowerCase())) {
          langScores[lang] += 1;
        }
      }
    }
  }

  for (const mealTypeEntry of Object.values(MULTILANG_MEAL_TYPES)) {
    for (const [lang, names] of Object.entries(mealTypeEntry)) {
      for (const name of names) {
        if (lowerText.includes(name.toLowerCase())) {
          langScores[lang] += 1;
        }
      }
    }
  }

  let bestLang = 'en';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(langScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestLang;
}

function parseDayName(line) {
  const trimmed = line.trim();
  // Bullet and numbered list items are never day headers
  if (/^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) return null;

  const lowerLine = trimmed.toLowerCase();
  for (const [canonicalDay, translations] of Object.entries(MULTILANG_DAYS)) {
    for (const langNames of Object.values(translations)) {
      for (const name of langNames) {
        // Require whole-word match so short abbreviations like "mi", "fr", "sa", "do"
        // don't match inside ingredient words like "mixta", "fruta", "ensalada", "cocido"
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|\\s)${escaped}(?:\\s|[,;:.]|$)`, 'i').test(lowerLine)) {
          return canonicalDay;
        }
      }
    }
  }
  return null;
}

function parseMealType(line) {
  const lowerLine = line.toLowerCase();
  for (const [canonicalType, translations] of Object.entries(MULTILANG_MEAL_TYPES)) {
    for (const langNames of Object.values(translations)) {
      for (const name of langNames) {
        if (lowerLine.startsWith(name.toLowerCase()) ||
            lowerLine.includes(name.toLowerCase() + ':')) {
          return canonicalType;
        }
      }
    }
  }
  return null;
}

function parseIngredients(line) {
  const ingredientsMatch = line.match(/(?:ingredientes|ingredients|ingrédients|zutaten|ingredienti|ingrediënten)\s*[:\-]?\s*(.+)/i);
  if (ingredientsMatch) {
    return ingredientsMatch[1].split(/,|;|\//).map(i => i.trim()).filter(i => i.length > 0);
  }
  return null;
}

function cleanMealName(line, mealType, day) {
  let cleaned = line;
  for (const translations of Object.values(MULTILANG_MEAL_TYPES)) {
    for (const langNames of Object.values(translations)) {
      for (const name of langNames) {
        const regex = new RegExp(`^${name}\\s*[:\\-]?\\s*`, 'i');
        cleaned = cleaned.replace(regex, '');
      }
    }
  }

  cleaned = cleaned.replace(/(?:ingredientes|ingredients|ingrédients|zutaten|ingredienti|ingrediënten)\s*[:\-]?\s*.+/gi, '');
  cleaned = cleaned.replace(/\s*-\s*$/, '');
  cleaned = cleaned.replace(/\s*\(\s*\)/g, '');
  cleaned = cleaned.trim();

  return cleaned || line;
}

function parseDietPlan(text) {
  if (!text || !text.trim()) {
    showToast('Por favor, introduce un plan de dieta para analizar', 'error');
    return [];
  }

  const lang = detectLanguage(text);
  currentLanguage = lang;
  const lines = text.split('\n');

  let currentDay = null;
  let currentMealType = null;
  let currentMealIngredients = [];
  let currentMealName = '';
  let dayCount = 0;
  const parsedMealsList = [];
  const preDayMeals = []; // meals encountered before the first day heading

  parseLog.length = 0;
  logParse('info', `Iniciando análisis del plan de dieta...`);
  logParse('info', `Longitud de entrada: ${text.length} caracteres`);
  logParse('info', `Procesando ${lines.length} líneas...`);

  function commitMeal() {
    if (!currentMealType) return;
    const canonicalType = getCanonicalMealType(currentMealType);
    const mealEntry = {
      meal_type: canonicalType,
      name: currentMealName,
      description: null,
      ingredients: [...currentMealIngredients],
      language: lang
    };
    if (!currentDay) {
      preDayMeals.push(mealEntry);
      logParse('info', `Comida global (pre-día): ${canonicalType} -> "${currentMealName}" (${currentMealIngredients.length} ingredientes)`);
    } else {
      parsedMealsList.push({ day_of_week: currentDay, ...mealEntry });
      logParse('info', `Analizado: ${currentDay}/${canonicalType} -> "${currentMealName}" (${currentMealIngredients.length} ingredientes)`);
    }
    currentMealType = null;
    currentMealIngredients = [];
    currentMealName = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Skip separator lines (runs of 3+ identical punctuation chars)
    if (/^[-=*_~]{3,}$/.test(trimmed)) continue;

    // Skip document title/header lines
    if (trimmed.match(/^(plan|dieta|semana|menú|menu|alimentación|alimentacion|nutrition|diet plan|weekly|week|#)/i)) {
      logParse('info', `Omitiendo encabezado ${i + 1}: "${trimmed}"`);
      continue;
    }

    // Day name detection
    const day = parseDayName(trimmed);
    if (day) {
      commitMeal();
      currentDay = day;
      dayCount++;
      logParse('info', `Día detectado en línea ${i + 1}: ${day} ("${trimmed}")`);
      continue;
    }

    if (!currentDay) {
      // Before the first day heading: only process meal-type headers and their content.
      // Everything else (document intros, titles) is skipped.
      const mealType = parseMealType(trimmed);
      if (mealType) {
        commitMeal();
        currentMealType = mealType;
        currentMealName = cleanMealName(trimmed, mealType, null) || trimmed;
        const inlineIngredients = parseIngredients(trimmed);
        if (inlineIngredients) currentMealIngredients = inlineIngredients;
      } else if (currentMealType) {
        // Inside a pre-day meal: accept bullets, numbered items, and plain lines as ingredients
        const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
        if (bulletMatch) { currentMealIngredients.push(bulletMatch[1].trim()); }
        else {
          const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
          if (numberedMatch) { currentMealIngredients.push(numberedMatch[1].trim()); }
          else { currentMealIngredients.push(trimmed); }
        }
      } else {
        logParse('warn', `Línea ${i + 1} omitida (sin contexto de día aún): "${trimmed}"`);
      }
      continue;
    }

    // Bullet item (- item, • item, * item) — add to current meal's ingredients
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
    if (bulletMatch && currentMealType) {
      currentMealIngredients.push(bulletMatch[1].trim());
      continue;
    }

    // Numbered list item (1. item, 1) item)
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch && currentMealType) {
      currentMealIngredients.push(numberedMatch[1].trim());
      continue;
    }

    // Meal type header
    const mealType = parseMealType(trimmed);
    if (mealType) {
      commitMeal();
      currentMealType = mealType;
      currentMealName = cleanMealName(trimmed, mealType, currentDay) || trimmed;
      // Inline ingredients on the same line (e.g., "Desayuno: pan, aceite")
      const inlineIngredients = parseIngredients(trimmed);
      if (inlineIngredients) currentMealIngredients = inlineIngredients;
      continue;
    }

    // Unmatched non-bullet line while inside a meal → treat as plain ingredient
    if (currentMealType) {
      currentMealIngredients.push(trimmed);
      logParse('info', `Línea ${i + 1} añadida como ingrediente de ${currentMealType}: "${trimmed}"`);
    } else {
      logParse('warn', `Línea ${i + 1} omitida: "${trimmed}"`);
    }
  }

  commitMeal(); // flush the last meal

  // Propagate pre-day global meals to every parsed day that lacks that meal type
  if (preDayMeals.length > 0) {
    const parsedDays = [...new Set(parsedMealsList.map(m => m.day_of_week))];
    for (const globalMeal of preDayMeals) {
      for (const day of parsedDays) {
        const alreadyHas = parsedMealsList.some(
          m => m.day_of_week === day && m.meal_type === globalMeal.meal_type
        );
        if (!alreadyHas) {
          parsedMealsList.push({ ...globalMeal, day_of_week: day });
          logParse('info', `Comida global aplicada a ${day}: ${globalMeal.meal_type} -> "${globalMeal.name}"`);
        }
      }
    }
  }

  logParse('info', `Análisis completo: ${parsedMealsList.length} comidas de ${dayCount} días (idioma: ${lang})`);

  if (parsedMealsList.length === 0) {
    showToast('No se pudieron analizar comidas. Revisa el formato en la ayuda.', 'warning');
  }

  return parsedMealsList;
}

function renderPreview(plan) {
  const container = $('#preview-content');

  if (!plan?.days?.length) {
    container.innerHTML = `<div class="empty-state"><p>No se encontraron comidas en el plan analizado.</p></div>`;
    return;
  }

  const MEAL_LABELS = {
    breakfast: 'Desayuno',
    morning_snack: 'Media mañana',
    lunch: 'Almuerzo',
    snack: 'Merienda',
    dinner: 'Cena'
  };
  const MEAL_CLASS = {
    breakfast: 'breakfast', morning_snack: 'snack',
    lunch: 'lunch', snack: 'snack', dinner: 'dinner'
  };

  let html = '';

  // Plan meta bar
  if (plan.title || plan.period) {
    html += `<div class="preview-plan-meta">`;
    if (plan.title) html += `<span class="preview-plan-title">${plan.title}</span>`;
    if (plan.period) html += `<span class="preview-plan-period">${plan.period}</span>`;
    html += `</div>`;
  }

  // Warnings
  if (plan.warnings?.length) {
    html += `<div class="preview-warnings">`;
    plan.warnings.forEach(w => {
      html += `<div class="preview-warning"><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>${w}</div>`;
    });
    html += `</div>`;
  }

  // Days — skip days with no meals
  plan.days.filter(d => d.meals?.length).forEach(dayObj => {
    html += `<div class="preview-day">`;
    html += `<div class="preview-day-header"><h4>${dayObj.label || dayObj.day}</h4></div>`;
    html += `<div class="preview-meals-list">`;

    dayObj.meals.forEach(meal => {
      const label = MEAL_LABELS[meal.type] || meal.type;
      const cls = MEAL_CLASS[meal.type] || 'snack';
      const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
      html += `<div class="preview-meal-entry">`;
      html += `<span class="preview-meal-type ${cls}">${label}</span>`;
      html += `<div class="preview-meal-detail">`;
      if (ingredients.length > 0) {
        html += `<ul class="preview-ingredients">`;
        ingredients.forEach(ing => { html += `<li>${ing}</li>`; });
        html += `</ul>`;
      } else {
        const mealName = meal.name?.trim();
        if (mealName && mealName.toLowerCase() !== label.toLowerCase()) {
          html += `<p class="preview-meal-name">${mealName}</p>`;
        }
        if (meal.description) {
          html += `<p class="preview-meal-desc">${meal.description}</p>`;
        }
      }
      html += `</div></div>`;
    });

    html += `</div></div>`;
  });

  container.innerHTML = html;
}

// =====================
// Import helpers
// =====================
function flatMealsToPlan(flatMeals) {
  const DAY_LABELS_ES = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
  };
  const dayMap = {};
  for (const meal of flatMeals) {
    const d = meal.day_of_week;
    if (!dayMap[d]) dayMap[d] = [];
    dayMap[d].push({
      type: meal.meal_type,
      name: meal.name,
      description: meal.description || null,
      ingredients: Array.isArray(meal.ingredients) ? [...meal.ingredients] : []
    });
  }
  return {
    title: null,
    period: null,
    planType: 'weekly',
    language: currentLanguage,
    days: DAYS.filter(d => dayMap[d]?.length).map(d => ({
      day: d,
      label: DAY_LABELS_ES[d] || d,
      meals: dayMap[d]
    })),
    warnings: []
  };
}

function renderParseLog() {
  const container = $('#parse-log');
  if (!container || parseLog.length === 0) return;

  const errorCount = parseLog.filter(l => l.level === 'error').length;
  const warnCount = parseLog.filter(l => l.level === 'warn').length;

  container.innerHTML = `
    <div class="parse-log-header">
      <h4>Registro de Análisis</h4>
      <span class="log-stats">${parseLog.length} entradas | ${warnCount} advertencias | ${errorCount} errores</span>
    </div>
    <div class="parse-log-entries">
      ${parseLog.map(entry => `
        <div class="log-entry ${entry.level}">
          <span class="log-time">${entry.time.split('T')[1].split('.')[0]}</span>
          <span class="log-level">${entry.level.toUpperCase()}</span>
          <span class="log-message">${entry.message}</span>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-sm btn-secondary" onclick="$('#parse-log').classList.toggle('expanded')">Mostrar/Ocultar Detalles</button>
  `;
  container.classList.remove('hidden');
}

// For each meal type that appears on some active days but not all, copy the
// identical meal to the missing days — provided those days have no meal of
// that type already.  This corrects the common parser failure where a shared
// table cell (e.g. one breakfast row spanning the whole week) is only
// assigned to the subset of days the parser happened to read it for.
function propagateSharedMeals(meals) {
  const activeDays = new Set(meals.map(m => m.day_of_week));
  if (activeDays.size < 2) return meals;

  const fp = m => `${m.meal_type}||${m.name}||${(m.ingredients || []).join('|')}`;
  const groups = new Map();

  for (const meal of meals) {
    const key = fp(meal);
    if (!groups.has(key)) groups.set(key, { days: new Set(), template: meal });
    groups.get(key).days.add(meal.day_of_week);
  }

  const extra = [];
  for (const { days: coveredDays, template } of groups.values()) {
    for (const day of activeDays) {
      if (coveredDays.has(day)) continue;
      const dayHasType = meals.some(
        m => m.day_of_week === day && m.meal_type === template.meal_type
      );
      if (dayHasType) continue;
      extra.push({ ...template, day_of_week: day });
    }
  }

  return extra.length > 0 ? [...meals, ...extra] : meals;
}

function setupImport() {
  const dietText = $('#diet-text');
  const parseBtn = $('#parse-diet-btn');
  const clearBtn = $('#clear-diet-btn');
  const importBtn = $('#import-meals-btn');
  const importShoppingBtn = $('#import-shopping-btn');
  const cancelBtn = $('#cancel-import-btn');
  const langBadge = $('#detected-language');
  const fileInput = $('#diet-file');
  const fileUploadArea = $('#file-upload-area');
  const fileSelectedBar = $('#file-selected');
  const fileNameLabel = $('#file-name');
  const removeFileBtn = $('#remove-file-btn');

  let selectedFile = null;

  const helpToggle = $('#format-help-toggle');
  const helpPanel = $('#format-help');
  if (helpToggle && helpPanel) {
    helpToggle.addEventListener('click', () => {
      helpPanel.classList.toggle('hidden');
    });
  }

  // File selection handling
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        showToast('El archivo supera el límite de 4 MB', 'error');
        fileInput.value = '';
        return;
      }
      selectedFile = file;
      fileNameLabel.textContent = file.name;
      fileSelectedBar.classList.remove('hidden');
      fileUploadArea.classList.add('hidden');
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      fileSelectedBar.classList.add('hidden');
      fileUploadArea.classList.remove('hidden');
    });
  }

  // Helper: render results after successful AI or fallback parse
  function applyParsedMeals(meals, language, source) {
    parsedMeals = propagateSharedMeals(meals);
    if (language) currentLanguage = language;

    if (parsedMeals.length === 0) {
      importBtn.disabled = true;
      importShoppingBtn.disabled = true;
      showToast('No se encontraron comidas en el plan.', 'warning');
      return;
    }

    parsedPlan = flatMealsToPlan(parsedMeals);
    console.log(parsedMeals);
    console.log('parsedPlan:', JSON.parse(JSON.stringify(parsedPlan)));
    renderPreview(parsedPlan);
    $('#meals-count').textContent = `${parsedMeals.length} comidas`;
    $('#import-preview').classList.remove('hidden');
    $('#import-placeholder').classList.add('hidden');
    importBtn.disabled = false;
    importShoppingBtn.disabled = false;

    const lang = currentLanguage;
    if (langBadge) {
      langBadge.textContent = LANGUAGE_LABELS[lang] || lang;
      langBadge.classList.remove('hidden');
    }

    const sourceLabel = source === 'ai' ? 'IA (Gemini)' : 'analizador de texto';
    showToast(`Analizadas ${parsedMeals.length} comidas con ${sourceLabel}`, 'success');

    if (source === 'text') renderParseLog();
  }

  parseBtn.addEventListener('click', async () => {
    const text = dietText.value.trim();

    if (!selectedFile && !text) {
      showToast('Sube un archivo o pega el texto de tu plan de dieta', 'error');
      return;
    }

    parseBtn.disabled = true;
    parseBtn.innerHTML = 'Analizando con IA…';
    parseLog.length = 0;

    try {
      let payload;

      if (selectedFile) {
        const fileBase64 = await readFileAsBase64(selectedFile);
        payload = { fileBase64, mimeType: selectedFile.type };
      } else {
        payload = { text };
      }

      const result = await callDietParser(payload);
      applyParsedMeals(result.meals, result.language, 'ai');
    } catch (aiErr) {
      console.warn('Diet-parser edge function failed:', aiErr.message);

      // Fallback: use the local parser only when plain text is available
      if (text) {
        showToast('Servicio IA no disponible — usando el analizador de texto', 'warning');
        const fallbackMeals = parseDietPlan(text);
        applyParsedMeals(fallbackMeals, currentLanguage, 'text');
      } else {
        showToast(`Error al analizar: ${aiErr.message}`, 'error');
        importBtn.disabled = true;
        importShoppingBtn.disabled = true;
      }
    } finally {
      parseBtn.disabled = false;
      parseBtn.innerHTML = 'Analizar plan';
    }
  });

  clearBtn.addEventListener('click', resetImportUI);
  cancelBtn.addEventListener('click', resetImportUI);

  importBtn.addEventListener('click', async () => {
    if (parsedMeals.length === 0) return;

    const doImport = async () => {
      importBtn.disabled = true;
      importBtn.innerHTML = 'Importando…';
      try {
        const mealsToInsert = parsedMeals.map((meal, index) => ({
          ...meal,
          user_id: currentUser.id,
          language: currentLanguage,
          display_order: index
        }));
        const { error } = await supabase.from('meals').insert(mealsToInsert);
        if (error) throw error;
        await savePlanDocument(selectedFile);
        selectedFile = null;
        showToast(`¡Importadas ${parsedMeals.length} comidas con éxito!`, 'success');
        resetImportUI();
        await loadMeals();
        updateDietView();
        window.switchSection('diet');
      } catch (err) {
        console.error('Error de importación:', err);
        showToast('Error al importar comidas. Por favor, intenta de nuevo.', 'error');
        importBtn.disabled = false;
        importBtn.innerHTML = 'Importar comidas';
      }
    };

    if (meals.length > 0) {
      showImportConfirm(doImport);
      return;
    }
    await doImport();
  });

  importShoppingBtn.addEventListener('click', async () => {
    if (parsedMeals.length === 0) return;

    const doImport = async () => {
      importShoppingBtn.disabled = true;
      importShoppingBtn.innerHTML = 'Importando…';
      try {
        const mealsToInsert = parsedMeals.map((meal, index) => ({
          ...meal,
          user_id: currentUser.id,
          language: currentLanguage,
          display_order: index
        }));
        const { error: mealError } = await supabase.from('meals').insert(mealsToInsert);
        if (mealError) throw mealError;
        await savePlanDocument(selectedFile);
        selectedFile = null;

        await loadMeals();
        updateDietView();
        window.switchSection('diet');

        // Clear previously generated items before inserting a fresh set,
        // same as generateShoppingList does, to prevent stale entries mixing
        // with items from the newly imported plan.
        await supabase
          .from('shopping_items')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('is_custom', false);
        await loadShoppingItems();
        const customOnly = shoppingItems.filter(i => i.is_custom);

        const merged = collectShoppingIngredients(parsedMeals);
        const existingCustomNames = new Set(customOnly.map(i => normalizeIngredientKey(i.name)));
        const newItems = merged
          .filter(item => !existingCustomNames.has(normalizeIngredientKey(item.name)))
          .map(item => ({
            user_id: currentUser.id,
            name: item.name,
            quantity: item.quantity,
            completed: false,
            is_custom: false
          }));

        if (newItems.length > 0) {
          const { error: shopError } = await supabase.from('shopping_items').insert(newItems);
          if (shopError) logParse('warn', `Error al insertar lista de compra: ${shopError.message}`);
        }

        await loadShoppingItems();
        renderShoppingList();
        showToast(`¡Importadas ${parsedMeals.length} comidas + ${newItems.length} artículos de compra!`, 'success');
        resetImportUI();
      } catch (err) {
        console.error('Error de importación:', err);
        showToast('Error al importar. Por favor, intenta de nuevo.', 'error');
        importShoppingBtn.disabled = false;
        importShoppingBtn.innerHTML = 'Importar + lista de la compra';
      }
    };

    if (meals.length > 0) {
      showImportConfirm(doImport);
      return;
    }
    await doImport();
  });
}

function resetImportUI() {
  const langBadge = $('#detected-language');
  $('#diet-text').value = '';

  // Clear file selection if present
  const fileInput = $('#diet-file');
  if (fileInput) fileInput.value = '';
  const fileSelectedBar = $('#file-selected');
  const fileUploadArea = $('#file-upload-area');
  if (fileSelectedBar) fileSelectedBar.classList.add('hidden');
  if (fileUploadArea) fileUploadArea.classList.remove('hidden');

  parsedMeals = [];
  parsedPlan = null;
  parseLog.length = 0;
  $('#import-preview').classList.add('hidden');
  $('#import-placeholder').classList.remove('hidden');
  $('#parse-log').classList.add('hidden');
  $('#import-meals-btn').disabled = true;
  $('#import-meals-btn').innerHTML = 'Importar comidas';
  $('#import-shopping-btn').disabled = true;
  $('#import-shopping-btn').innerHTML = 'Importar + lista de la compra';
  if (langBadge) langBadge.classList.add('hidden');
}

function showImportConfirm(callback) {
  pendingImportCallback = callback;
  $('#import-confirm-modal').classList.remove('hidden');
}

function showConfirm(title, message, callback) {
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  confirmCallback = callback;
  $('#confirm-modal').classList.remove('hidden');
}

// =====================
// Gestión de comidas
// =====================
function setupMealManagement() {
  // View original plan document
  $('#view-plan-document-btn')?.addEventListener('click', viewPlanDocument);

  // Delete plan
  $('#delete-plan-btn')?.addEventListener('click', () => {
    showConfirm(
      'Eliminar plan de alimentación',
      '¿Seguro que quieres eliminar todo tu plan? Esta acción no se puede deshacer.',
      deletePlan
    );
  });

  // Generic confirm modal
  const closeConfirm = () => {
    $('#confirm-modal').classList.add('hidden');
    confirmCallback = null;
  };
  $$('#confirm-modal .modal-close, #confirm-modal .confirm-cancel').forEach(b => b.addEventListener('click', closeConfirm));
  $('#confirm-modal .modal-overlay')?.addEventListener('click', closeConfirm);
  $('#confirm-ok').addEventListener('click', async () => {
    const cb = confirmCallback;
    closeConfirm();
    if (cb) await cb();
  });

  // Import confirm modal
  const closeImportConfirm = () => {
    $('#import-confirm-modal').classList.add('hidden');
    pendingImportCallback = null;
    $('#import-meals-btn').disabled = false;
    $('#import-shopping-btn').disabled = false;
  };
  $$('#import-confirm-modal .modal-close, #import-confirm-modal .import-confirm-cancel').forEach(b => b.addEventListener('click', closeImportConfirm));
  $('#import-confirm-modal .modal-overlay')?.addEventListener('click', closeImportConfirm);

  $('#import-confirm-replace').addEventListener('click', async () => {
    closeImportConfirm();
    if (!pendingImportCallback) return;
    const cb = pendingImportCallback;
    pendingImportCallback = null;
    const { error } = await supabase.from('meals').delete().eq('user_id', currentUser.id);
    if (error) { showToast('Error al eliminar el plan existente', 'error'); return; }
    meals = [];
    await cb();
  });

  $('#import-confirm-merge').addEventListener('click', async () => {
    closeImportConfirm();
    if (!pendingImportCallback) return;
    const cb = pendingImportCallback;
    pendingImportCallback = null;
    await cb();
  });

  // Meal form modal (edit + add)
  const closeMealForm = () => {
    $('#meal-form-modal').classList.add('hidden');
    activeMealId = null;
  };
  $$('#meal-form-modal .modal-close, #meal-form-modal .modal-cancel').forEach(b => b.addEventListener('click', closeMealForm));
  $('#meal-form-modal .modal-overlay')?.addEventListener('click', closeMealForm);

  $('#meal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#meal-form-name').value.trim();
    const description = $('#meal-form-description').value.trim() || null;
    const meal_type = $('#meal-form-type').value;
    const day_of_week = $('#meal-form-day').value;

    if (activeMealId) {
      const { error } = await supabase
        .from('meals')
        .update({ name, description, meal_type, day_of_week })
        .eq('id', activeMealId);
      if (error) { showToast('Error al guardar los cambios', 'error'); return; }
      showToast('Comida actualizada', 'success');
    } else {
      const { error } = await supabase.from('meals').insert({
        user_id: currentUser.id,
        name,
        description,
        meal_type,
        day_of_week,
        ingredients: [],
        language: currentLanguage
      });
      if (error) { showToast('Error al añadir la comida', 'error'); return; }
      showToast('Comida añadida', 'success');
    }

    closeMealForm();
    await loadMeals();
    updateDietView();
  });
}

async function savePlanDocument(file) {
  const importSource = !file
    ? 'text'
    : file.type === 'application/pdf' ? 'pdf' : 'image';

  let storagePath = null;
  if (file) {
    storagePath = `${currentUser.id}/plan-document`;
    const { error: uploadError } = await supabase.storage
      .from('plan-documents')
      .upload(storagePath, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      console.warn('Error al subir el documento:', uploadError.message);
      storagePath = null;
    }
  } else if (planDocument?.storage_path) {
    await supabase.storage.from('plan-documents').remove([planDocument.storage_path]);
  }

  const { data } = await supabase
    .from('plan_documents')
    .upsert({
      user_id: currentUser.id,
      file_name: file?.name ?? null,
      mime_type: file?.type ?? null,
      storage_path: storagePath,
      import_source: importSource
    }, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  planDocument = data;
}

async function deletePlanDocument() {
  if (planDocument?.storage_path) {
    await supabase.storage.from('plan-documents').remove([planDocument.storage_path]);
  }
  await supabase.from('plan_documents').delete().eq('user_id', currentUser.id);
  planDocument = null;
}

async function viewPlanDocument() {
  if (!planDocument?.storage_path) return;
  const { data, error } = await supabase.storage
    .from('plan-documents')
    .createSignedUrl(planDocument.storage_path, 60);
  if (error || !data?.signedUrl) {
    showToast('No se pudo abrir el documento', 'error');
    return;
  }
  window.open(data.signedUrl, '_blank');
}

async function deletePlan() {
  await deletePlanDocument();
  const { error } = await supabase.from('meals').delete().eq('user_id', currentUser.id);
  if (error) { showToast('Error al eliminar el plan', 'error'); return; }
  showToast('Plan eliminado', 'success');
  meals = [];
  updateDietView();
}

window.editMeal = (id) => {
  const meal = meals.find(m => m.id === id);
  if (!meal) return;
  activeMealId = id;
  $('#meal-form-title').textContent = 'Editar comida';
  $('#meal-form-submit').textContent = 'Guardar cambios';
  $('#meal-form-name').value = meal.name;
  $('#meal-form-description').value = meal.description || '';
  $('#meal-form-type').value = meal.meal_type;
  $('#meal-form-day').value = meal.day_of_week;
  $('#meal-form-modal').classList.remove('hidden');
};

window.deleteMealItem = (id) => {
  showConfirm('Eliminar comida', '¿Seguro que quieres eliminar esta comida?', async () => {
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) { showToast('Error al eliminar la comida', 'error'); return; }
    showToast('Comida eliminada', 'success');
    await loadMeals();
    updateDietView();
  });
};

window.prevViewDay = () => {
  currentViewDayIndex = (currentViewDayIndex - 1 + 7) % 7;
  updateDietView();
};

window.nextViewDay = () => {
  currentViewDayIndex = (currentViewDayIndex + 1) % 7;
  updateDietView();
};

window.addMealToDay = (day) => {
  activeMealId = null;
  $('#meal-form-title').textContent = 'Añadir comida';
  $('#meal-form-submit').textContent = 'Añadir comida';
  $('#meal-form-name').value = '';
  $('#meal-form-description').value = '';
  $('#meal-form-type').value = 'breakfast';
  $('#meal-form-day').value = day;
  $('#meal-form-modal').classList.remove('hidden');
};

// =====================
// Inicialización
// =====================
async function init() {
  setupAuthForms();
  setupNavigation();
  setupShoppingList();
  setupItemModal();
  setupAssistant();
  setupImport();
  setupMealManagement();

  await initAuth();
}

document.addEventListener('DOMContentLoaded', init);
