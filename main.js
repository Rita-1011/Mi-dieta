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
    loadShoppingItems()
  ]);

  updateDietView();
  renderShoppingList();
}

async function loadMeals() {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', currentUser.id)
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
function updateDietView() {
  updateUILanguage();
  $('#current-date').textContent = formatDate(new Date());

  const emptyState = $('#diet-empty');
  const dietView = $('#diet-view');
  const dietDaysGrid = $('#diet-days-grid');

  if (meals.length === 0) {
    emptyState.classList.remove('hidden');
    dietView.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  dietView.classList.remove('hidden');

  const lang = getLanguage();
  const dayLabels = DAY_LABELS[lang] || DAY_LABELS.en;
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

  const mealsByDay = {};
  DAYS.forEach(day => mealsByDay[day] = []);
  meals.forEach(meal => {
    if (mealsByDay[meal.day_of_week]) {
      mealsByDay[meal.day_of_week].push(meal);
    }
  });

  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealIcons = {
    breakfast: '🌅',
    lunch: '🌞',
    dinner: '🌙',
    snack: '🥑'
  };

  const emptyTexts = {
    es: 'Sin comidas planificadas',
    en: 'No meals planned',
    pt: 'Sem refeições planificadas',
    fr: 'Aucun repas planifié',
    de: 'Keine Mahlzeiten geplant',
    it: 'Nessun pasto pianificato',
    nl: 'Geen maaltijden gepland'
  };

  const container = dietDaysGrid;
  container.innerHTML = DAYS.map(day => {
    const dayMeals = mealsByDay[day];
    const mealCount = dayMeals.length;
    const emptySlot = mealCount === 0 ? `<div class="diet-meal empty-slot">${emptyTexts[lang] || emptyTexts.en}</div>` : '';

    const dayMealsSorted = [...dayMeals].sort((a, b) => {
      return mealTypeOrder.indexOf(a.meal_type) - mealTypeOrder.indexOf(b.meal_type);
    });

    const mealsList = dayMealsSorted.map(meal => {
      const mealTypeLabel = mealTypeLabels[meal.meal_type] || meal.meal_type;
      return `
        <div class="diet-meal">
          <div class="meal-header">
            <span class="meal-type ${meal.meal_type}">${mealIcons[meal.meal_type]} ${mealTypeLabel}</span>
            <div class="meal-actions">
              <button class="meal-action-btn" onclick="window.editMeal('${meal.id}')" title="Editar">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
              </button>
              <button class="meal-action-btn danger" onclick="window.deleteMealItem('${meal.id}')" title="Eliminar">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              </button>
            </div>
          </div>
          <div class="meal-name">${meal.name}</div>
          ${meal.description ? `<div class="meal-description">${meal.description}</div>` : ''}
        </div>
      `;
    }).join('');

    const dayClasses = dayMeals.length > 0 ? 'diet-day has-meals' : 'diet-day';
    const isToday = getCurrentDayOfWeek() === day;

    return `
      <div class="${dayClasses} ${isToday ? 'today' : ''}">
        <div class="diet-day-header">
          <h3>${dayLabels[day] || day}</h3>
          <span class="meal-count">${mealCount} comida${mealCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="diet-meals">
          ${mealsList || emptySlot}
        </div>
        <div class="diet-day-footer">
          <button class="add-meal-day-btn" onclick="window.addMealToDay('${day}')">+ Añadir</button>
        </div>
      </div>
    `;
  }).join('');
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
          <span class="item-quantity">${item.quantity}</span>
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

async function generateShoppingList() {
  const allIngredients = new Map();

  meals.forEach(meal => {
    (meal.ingredients || []).forEach(ingredient => {
      const key = ingredient.toLowerCase().trim();
      if (key) {
        allIngredients.set(key, (allIngredients.get(key) || 0) + 1);
      }
    });
  });

  const existingNames = new Set(shoppingItems.map(i => i.name.toLowerCase()));
  const newItems = [];

  for (const [name, count] of allIngredients) {
    if (!existingNames.has(name)) {
      newItems.push({
        user_id: currentUser.id,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: count > 1 ? `${count}x` : '1',
        completed: false,
        is_custom: false
      });
    }
  }

  if (newItems.length === 0) {
    showToast('No hay nuevos artículos para añadir desde las comidas', 'info');
    return;
  }

  const { error } = await supabase
    .from('shopping_items')
    .insert(newItems);

  if (error) {
    showToast('Error al generar la lista', 'error');
  } else {
    showToast(`¡Añadidos ${newItems.length} artículos!`, 'success');
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

function showSubstitutes(ingredient) {
  const result = getSubstitutes(ingredient);

  if (!result) {
    showToast(`No se encontraron sustitutos para "${ingredient}". Prueba: mantequilla, azúcar, leche, huevos o harina.`, 'info');
    return;
  }

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
  const lowerLine = line.toLowerCase();
  for (const [canonicalDay, translations] of Object.entries(MULTILANG_DAYS)) {
    for (const langNames of Object.values(translations)) {
      for (const name of langNames) {
        if (lowerLine.includes(name.toLowerCase())) {
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
  const parsedMealsList = [];
  let dayCount = 0;

  parseLog.length = 0;
  logParse('info', `Iniciando análisis del plan de dieta...`);
  logParse('info', `Longitud de entrada: ${text.length} caracteres`);
  logParse('info', `Procesando ${lines.length} líneas...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (trimmed.match(/^(plan|dieta|dieta semanal|semana|menú|menu|alimentación|nutrition|diet plan|weekly|week|#)/i)) {
      logParse('info', `Omitiendo línea de título/encabezado ${i + 1}: "${trimmed}"`);
      continue;
    }

    const day = parseDayName(trimmed);
    if (day) {
      currentDay = day;
      dayCount++;
      logParse('info', `Día detectado en línea ${i + 1}: ${day} ("${trimmed}")`);
      continue;
    }

    if (currentDay) {
      const mealType = parseMealType(trimmed);
      if (mealType) {
        const ingredients = parseIngredients(trimmed);
        const cleanName = cleanMealName(trimmed, mealType, currentDay);

        const canonicalType = getCanonicalMealType(mealType);

        const meal = {
          day_of_week: currentDay,
          meal_type: canonicalType,
          name: cleanName,
          description: null,
          ingredients: ingredients || [],
          language: lang
        };

        parsedMealsList.push(meal);
        logParse('info', `Analizado: ${currentDay}/${canonicalType} -> "${cleanName}"`);
      } else if (trimmed.length > 0) {
        logParse('warn', `Omitiendo línea (sin tipo de comida o día): "${trimmed}"`);
      }
    } else {
      logParse('warn', `Línea ${i + 1} omitida (sin contexto de día aún): "${trimmed}"`);
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
      html += `<div class="preview-meal-entry">`;
      html += `<span class="preview-meal-type ${cls}">${label}</span>`;
      html += `<div class="preview-meal-detail">`;

      // Show name only if it differs from the type label
      const mealName = meal.name?.trim();
      if (mealName && mealName.toLowerCase() !== label.toLowerCase()) {
        html += `<p class="preview-meal-name">${mealName}</p>`;
      }

      if (meal.ingredients?.length) {
        html += `<ul class="preview-ingredients">`;
        meal.ingredients.forEach(ing => { html += `<li>${ing}</li>`; });
        html += `</ul>`;
      } else if (meal.description) {
        html += `<p class="preview-meal-desc">${meal.description}</p>`;
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
      ingredients: meal.ingredients || []
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

function setupImport() {
  const dietText = $('#diet-text');
  const parseBtn = $('#parse-diet-btn');
  const clearBtn = $('#clear-diet-btn');
  const importBtn = $('#import-meals-btn');
  const importShoppingBtn = $('#import-shopping-btn');
  const cancelBtn = $('#cancel-import-btn');
  const langBadge = $('#detected-language');

  const helpToggle = $('#format-help-toggle');
  const helpPanel = $('#format-help');
  if (helpToggle && helpPanel) {
    helpToggle.addEventListener('click', () => {
      helpPanel.classList.toggle('hidden');
    });
  }

  parseBtn.addEventListener('click', () => {
    const text = dietText.value.trim();
    if (!text) {
      showToast('Por favor, introduce un plan de dieta para analizar', 'error');
      return;
    }

    parsedMeals = parseDietPlan(text);

    if (parsedMeals.length === 0) {
      importBtn.disabled = true;
      importShoppingBtn.disabled = true;
      return;
    }

    parsedPlan = flatMealsToPlan(parsedMeals);
    renderPreview(parsedPlan);
    $('#meals-count').textContent = `${parsedMeals.length} comidas`;
    $('#import-preview').classList.remove('hidden');
    $('#import-placeholder').classList.add('hidden');
    importBtn.disabled = false;
    importShoppingBtn.disabled = false;

    const lang = getLanguage();
    if (langBadge) {
      langBadge.textContent = LANGUAGE_LABELS[lang] || lang;
      langBadge.classList.remove('hidden');
    }

    showToast(`Analizadas ${parsedMeals.length} comidas de tu plan (${LANGUAGE_LABELS[lang] || lang})`, 'success');
    renderParseLog();
  });

  clearBtn.addEventListener('click', resetImportUI);
  cancelBtn.addEventListener('click', resetImportUI);

  importBtn.addEventListener('click', async () => {
    if (parsedMeals.length === 0) return;

    const doImport = async () => {
      importBtn.disabled = true;
      importBtn.innerHTML = 'Importando…';
      try {
        const mealsToInsert = parsedMeals.map(meal => ({
          ...meal,
          user_id: currentUser.id,
          language: currentLanguage
        }));
        const { error } = await supabase.from('meals').insert(mealsToInsert);
        if (error) throw error;
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
        const mealsToInsert = parsedMeals.map(meal => ({
          ...meal,
          user_id: currentUser.id,
          language: currentLanguage
        }));
        const { error: mealError } = await supabase.from('meals').insert(mealsToInsert);
        if (mealError) throw mealError;

        await loadMeals();
        updateDietView();
        window.switchSection('diet');

        const allIngredients = new Map();
        parsedMeals.forEach(meal => {
          (meal.ingredients || []).forEach(ingredient => {
            const key = ingredient.toLowerCase().trim();
            if (key) allIngredients.set(key, (allIngredients.get(key) || 0) + 1);
          });
        });

        const existingNames = new Set(shoppingItems.map(i => i.name.toLowerCase()));
        const newItems = [];
        for (const [name, count] of allIngredients) {
          if (!existingNames.has(name)) {
            newItems.push({
              user_id: currentUser.id,
              name: name.charAt(0).toUpperCase() + name.slice(1),
              quantity: count > 1 ? `${count}x` : '1',
              completed: false,
              is_custom: false
            });
          }
        }

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

async function deletePlan() {
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
