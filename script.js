/* =========================================================
   CONTA FÁCIL — JAVASCRIPT PRINCIPAL

   Funcionalidades:
   - Dashboard semanal
   - Dashboard Elite mensal
   - Cadastro de movimentações
   - Edição de movimentações
   - Exclusão de movimentações
   - Cálculos automáticos
   - Metas financeiras
   - Exportação CSV

   Os registros continuam na chave:
   contaFacilTransactions

   Isso preserva os dados anteriores do navegador.
   ========================================================= */

// CATEGORIAS PARA PESSOA FÍSICA E JURÍDICA

const categories = {

  pf: {

    income: [
      'Salário',
      'Trabalho extra',
      'Rendimentos',
      'Outras receitas'
    ],

    expense: [
      'Alimentação',
      'Moradia',
      'Transporte',
      'Saúde',
      'Educação',
      'Lazer',
      'Assinaturas',
      'Contas',
      'Outras despesas'
    ],

    investment: [
      'Renda fixa',
      'Ações',
      'Fundos',
      'Criptomoedas',
      'Outros investimentos'
    ],

    saving: [
      'Reserva de emergência',
      'Viagem',
      'Objetivo pessoal',
      'Outras economias'
    ]

  },

  pj: {

    income: [
      'Vendas',
      'Prestação de serviços',
      'Contratos',
      'Outras receitas'
    ],

    expense: [
      'Fornecedores',
      'Folha de pagamento',
      'Aluguel',
      'Impostos',
      'Marketing',
      'Operacional',
      'Contabilidade',
      'Outras despesas'
    ],

    investment: [
      'Equipamentos',
      'Expansão',
      'Tecnologia',
      'Aplicações',
      'Outros investimentos'
    ],

    saving: [
      'Capital de giro',
      'Reserva empresarial',
      'Expansão',
      'Outras reservas'
    ]

  }

};


// NOMES DOS TIPOS DE MOVIMENTAÇÃO

const typeNames = {

  income: 'Receita',
  expense: 'Despesa',
  investment: 'Investimento',
  saving: 'Economia'

};


// SÍMBOLOS DOS TIPOS DE MOVIMENTAÇÃO

const typeSymbols = {

  income: '↗',
  expense: '↘',
  investment: '◇',
  saving: '◎'

};


// ELEMENTOS DO FORMULÁRIO

const form = document.getElementById('transactionForm');

const descriptionInput =
  document.getElementById('description');

const amountInput =
  document.getElementById('amount');

const typeInput =
  document.getElementById('type');

const categoryInput =
  document.getElementById('category');

const dateInput =
  document.getElementById('date');

const transactionList =
  document.getElementById('transactionList');

const toast =
  document.getElementById('toast');


// INFORMAÇÕES SALVAS NO NAVEGADOR

let currentMode =
  localStorage.getItem('contaFacilMode') || 'pf';

let transactions =
  readStorage('contaFacilTransactions', []);

let goal =
  loadGoalForMode(currentMode);

let selectedWeekOffset = 0;

let selectedMonth = currentMonthISO();

// Guarda o ID da movimentação que está sendo editada.
let editingTransactionId = null;


// =========================================================
// ARMAZENAMENTO
// =========================================================

// Lê informações do localStorage.
function readStorage(key, fallback) {

  try {

    const saved = localStorage.getItem(key);

    return saved ? JSON.parse(saved) : fallback;

  } catch (error) {

    console.warn(
      'Não foi possível ler os dados salvos:',
      error
    );

    return fallback;

  }

}


// Salva todas as movimentações.
function saveTransactions() {

  localStorage.setItem(
    'contaFacilTransactions',
    JSON.stringify(transactions)
  );

}


// Cada ambiente possui sua própria meta.
function loadGoalForMode(mode) {

  const allGoals =
    readStorage('contaFacilGoals', null);

  if (allGoals && allGoals[mode]) {

    return allGoals[mode];

  }

  // Compatibilidade com a meta antiga.
  const oldGoal =
    readStorage('contaFacilGoal', {
      name: '',
      target: 0
    });

  if (oldGoal && (!oldGoal.mode || oldGoal.mode === mode)) {

    return oldGoal;

  }

  return {
    name: '',
    target: 0
  };

}


// Salva a meta do ambiente atual.
function saveGoalForMode(mode, newGoal) {

  const allGoals =
    readStorage('contaFacilGoals', {});

  allGoals[mode] = newGoal;

  localStorage.setItem(
    'contaFacilGoals',
    JSON.stringify(allGoals)
  );

}


// =========================================================
// FORMATAÇÃO DE VALORES E DATAS
// =========================================================

// Formata valores em reais.
function money(value) {

  return Number(value || 0).toLocaleString('pt-BR', {

    style: 'currency',
    currency: 'BRL'

  });

}


// Converte uma data para o padrão YYYY-MM-DD.
function dateToISO(date) {

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;

}


function todayISO() {

  return dateToISO(new Date());

}


function currentMonthISO() {

  return todayISO().slice(0, 7);

}


function parseISODate(value) {

  const [year, month, day] =
    value.split('-').map(Number);

  return new Date(
    year,
    month - 1,
    day
  );

}


function formatDate(value) {

  if (!value) return '';

  return parseISODate(value).toLocaleDateString('pt-BR');

}


function formatMonth(value) {

  const [year, month] =
    value.split('-').map(Number);

  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString('pt-BR', {

    month: 'long',
    year: 'numeric'

  });

}


// =========================================================
// NOTIFICAÇÕES
// =========================================================

// Mostra mensagens na tela.
function showToast(message) {

  toast.textContent = message;

  toast.classList.add('show');

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {

    toast.classList.remove('show');

  }, 2600);

}


// =========================================================
// CATEGORIAS
// =========================================================

// Atualiza categorias conforme o tipo de conta e registro.
function updateCategories() {

  const options =
    categories[currentMode][typeInput.value];

  categoryInput.innerHTML = options

    .map(category => `
      <option value="${category}">
        ${category}
      </option>
    `)

    .join('');

}


// =========================================================
// EDIÇÃO E EXCLUSÃO DE MOVIMENTAÇÕES
// =========================================================


// Restaura o formulário para um novo cadastro.
function resetTransactionForm() {

  editingTransactionId = null;

  form.reset();

  typeInput.value = 'income';

  updateCategories();

  dateInput.value = todayISO();

  document.getElementById(
    'transactionSubmitButton'
  ).innerHTML = '<span>＋</span> Adicionar registro';

  document.getElementById(
    'cancelEditButton'
  ).hidden = true;

  form.classList.remove('is-editing');

}


// Carrega uma movimentação para edição.
function startEditingTransaction(id) {

  const item = transactions.find(transaction =>
    String(transaction.id) === String(id)
  );

  if (!item || item.mode !== currentMode) {

    showToast(
      'Não foi possível localizar essa movimentação.'
    );

    return;

  }

  // Guarda o identificador do registro original.
  editingTransactionId = String(item.id);

  // Preenche o formulário com os dados existentes.
  descriptionInput.value =
    item.description || '';

  amountInput.value =
    Number(item.amount || 0);

  typeInput.value =
    item.type || 'income';

  updateCategories();

  // Mantém a categoria original quando disponível.
  if (
    [...categoryInput.options].some(
      option => option.value === item.category
    )
  ) {

    categoryInput.value = item.category;

  }

  dateInput.value =
    item.date || todayISO();

  // Altera o botão de cadastro para edição.
  document.getElementById(
    'transactionSubmitButton'
  ).innerHTML = '<span>✓</span> Salvar alterações';

  // Mostra o botão de cancelar.
  document.getElementById(
    'cancelEditButton'
  ).hidden = false;

  form.classList.add('is-editing');

  openView('transactions');

  form.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  descriptionInput.focus({
    preventScroll: true
  });

  showToast(
    'Edite os campos e salve as alterações.'
  );

}


// Exclui uma movimentação após confirmação.
function deleteTransaction(id) {

  const item = transactions.find(transaction =>
    String(transaction.id) === String(id)
  );

  if (!item) return;

  const confirmed = confirm(
    `Deseja realmente excluir a movimentação "${item.description}"?`
  );

  if (!confirmed) return;

  transactions = transactions.filter(transaction =>
    String(transaction.id) !== String(id)
  );

  // Cancela uma eventual edição do registro excluído.
  if (editingTransactionId === String(id)) {

    resetTransactionForm();

  }

  saveTransactions();

  refreshAll();

  showToast('Movimentação excluída.');

}


// Controla os botões de editar e excluir.
function handleTransactionActions(event) {

  const editButton =
    event.target.closest('[data-edit]');

  if (editButton) {

    startEditingTransaction(
      editButton.dataset.edit
    );

    return;

  }

  const deleteButton =
    event.target.closest('[data-delete]');

  if (deleteButton) {

    deleteTransaction(
      deleteButton.dataset.delete
    );

  }

}


// =========================================================
// FILTROS DE MOVIMENTAÇÕES
// =========================================================

// Retorna registros do ambiente PF ou PJ atual.
function getModeTransactions() {

  return transactions.filter(item =>
    item.mode === currentMode
  );

}


// Calcula a semana começando na segunda-feira.
function getSelectedWeekRange() {

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const monday = new Date(today);

  const dayOfWeek =
    (monday.getDay() + 6) % 7;

  monday.setDate(
    monday.getDate() -
    dayOfWeek +
    (selectedWeekOffset * 7)
  );

  const sunday = new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  return {

    start: dateToISO(monday),
    end: dateToISO(sunday),
    monday,
    sunday

  };

}


// Movimentações da semana selecionada.
function getWeekTransactions() {

  const range = getSelectedWeekRange();

  return getModeTransactions().filter(item =>

    item.date >= range.start &&
    item.date <= range.end

  );

}


// Movimentações do mês escolhido.
function getMonthTransactions(monthValue) {

  const month =
    monthValue || selectedMonth;

  return getModeTransactions().filter(item =>

    item.date &&
    item.date.startsWith(month)

  );

}


// Soma valores de um determinado tipo.
function sumByType(items, type) {

  return items

    .filter(item => item.type === type)

    .reduce((total, item) => {

      return total + Number(item.amount || 0);

    }, 0);

}


// Calcula o resultado líquido.
function calculatePeriodBalance(items) {

  return (
    sumByType(items, 'income') -
    sumByType(items, 'expense') -
    sumByType(items, 'investment') -
    sumByType(items, 'saving')
  );

}


// =========================================================
// DASHBOARD SEMANAL
// =========================================================

function updateWeeklyDashboard() {

  const range = getSelectedWeekRange();

  const items = getWeekTransactions();

  const income =
    sumByType(items, 'income');

  const expense =
    sumByType(items, 'expense');

  const investment =
    sumByType(items, 'investment');


  // Atualiza os indicadores.
  document.getElementById(
    'weeklyBalance'
  ).textContent = money(
    calculatePeriodBalance(items)
  );

  document.getElementById(
    'weeklyIncome'
  ).textContent = money(income);

  document.getElementById(
    'weeklyExpense'
  ).textContent = money(expense);

  document.getElementById(
    'weeklyInvestment'
  ).textContent = money(investment);


  // Atualiza o período exibido.
  const startText =
    range.monday.toLocaleDateString('pt-BR', {

      day: '2-digit',
      month: 'short'

    });

  const endText =
    range.sunday.toLocaleDateString('pt-BR', {

      day: '2-digit',
      month: 'short',
      year: 'numeric'

    });

  document.getElementById(
    'weekLabel'
  ).textContent = `${startText} – ${endText}`;

  document.getElementById(
    'weeklyChartChip'
  ).textContent = `${items.length} registros`;


  // Atualiza gráfico e lista.
  renderWeeklyChart(range.monday, items);

  renderSmallTransactionList(
    'weeklyTransactions',
    items,
    'Nenhuma movimentação nesta semana'
  );

  document.getElementById(
    'weeklyCount'
  ).textContent = `${items.length} ${
    items.length === 1 ? 'registro' : 'registros'
  }`;

}


// GRÁFICO DIÁRIO DA SEMANA
function renderWeeklyChart(monday, items) {

  const chart =
    document.getElementById('weeklyChart');

  const dailyTotals = [];

  let maxValue = 0;

  // Analisa os sete dias.
  for (let index = 0; index < 7; index++) {

    const day = new Date(monday);

    day.setDate(
      monday.getDate() + index
    );

    const iso = dateToISO(day);

    const dayItems = items.filter(item =>
      item.date === iso
    );

    const income =
      sumByType(dayItems, 'income');

    const expense =
      sumByType(dayItems, 'expense');

    maxValue = Math.max(
      maxValue,
      income,
      expense
    );

    dailyTotals.push({
      day,
      income,
      expense
    });

  }


  // Caso não existam movimentações.
  if (maxValue === 0) {

    chart.innerHTML = `
      <div class="chart-placeholder">
        Adicione movimentações para visualizar o gráfico.
      </div>
    `;

    return;

  }


  // Cria as barras do gráfico.
  chart.innerHTML = dailyTotals.map(item => {

    const incomeHeight =
      item.income > 0
        ? Math.max((item.income / maxValue) * 100, 4)
        : 0;

    const expenseHeight =
      item.expense > 0
        ? Math.max((item.expense / maxValue) * 100, 4)
        : 0;

    const dayName =
      item.day.toLocaleDateString(
        'pt-BR',
        { weekday: 'short' }
      ).replace('.', '');

    return `

      <div class="day-column">

        <div class="day-bars">

          <div
            class="day-bar income-bar"
            style="height:${incomeHeight}%"
            title="Receitas: ${money(item.income)}">
          </div>

          <div
            class="day-bar expense-bar"
            style="height:${expenseHeight}%"
            title="Despesas: ${money(item.expense)}">
          </div>

        </div>

        <span class="day-label">
          ${dayName}
        </span>

      </div>

    `;

  }).join('');

}


// =========================================================
// DASHBOARD ELITE MENSAL
// =========================================================

function updateMonthlyDashboard() {

  const items =
    getMonthTransactions(selectedMonth);

  const income =
    sumByType(items, 'income');

  const expense =
    sumByType(items, 'expense');

  const investment =
    sumByType(items, 'investment');

  const saving =
    sumByType(items, 'saving');

  const operatingResult =
    income - expense;


  // Atualiza os cartões.
  document.getElementById(
    'monthlyBalance'
  ).textContent = money(
    calculatePeriodBalance(items)
  );

  document.getElementById(
    'monthlyIncome'
  ).textContent = money(income);

  document.getElementById(
    'monthlyExpense'
  ).textContent = money(expense);

  document.getElementById(
    'monthlyInvestment'
  ).textContent = money(investment);

  document.getElementById(
    'monthlySaving'
  ).textContent = money(saving);

  document.getElementById(
    'monthlyOperatingResult'
  ).textContent = money(operatingResult);

  document.getElementById(
    'monthlyTransactionsCount'
  ).textContent = `${items.length} ${
    items.length === 1 ? 'registro' : 'registros'
  }`;

  document.getElementById(
    'monthlyChartChip'
  ).textContent = formatMonth(selectedMonth);


  // Atualiza gráficos.
  renderMonthlyChart(items);

  renderCategoryBreakdown(items);

}


// GRÁFICO MENSAL DIVIDIDO EM CINCO SEMANAS
function renderMonthlyChart(items) {

  const chart =
    document.getElementById('monthlyChart');

  const weeks = Array.from(
    { length: 5 },
    () => ({
      income: 0,
      expense: 0
    })
  );


  // Distribui cada movimentação na semana correspondente.
  items.forEach(item => {

    const day =
      Number(item.date.slice(8, 10));

    const weekIndex = Math.min(
      Math.floor((day - 1) / 7),
      4
    );

    if (item.type === 'income') {

      weeks[weekIndex].income +=
        Number(item.amount);

    }

    if (item.type === 'expense') {

      weeks[weekIndex].expense +=
        Number(item.amount);

    }

  });


  const maxValue = Math.max(
    1,
    ...weeks.flatMap(week => [
      week.income,
      week.expense
    ])
  );


  // Não mostra um gráfico vazio.
  if (!items.some(item =>
    item.type === 'income' ||
    item.type === 'expense'
  )) {

    chart.innerHTML = `
      <div class="chart-placeholder">
        Adicione receitas ou despesas para visualizar o gráfico.
      </div>
    `;

    return;

  }


  chart.innerHTML = weeks.map((week, index) => {

    const incomeHeight =
      week.income > 0
        ? Math.max((week.income / maxValue) * 100, 4)
        : 0;

    const expenseHeight =
      week.expense > 0
        ? Math.max((week.expense / maxValue) * 100, 4)
        : 0;

    return `

      <div class="month-column">

        <div class="month-bars">

          <div
            class="month-bar income-bar"
            style="height:${incomeHeight}%"
            title="Receitas: ${money(week.income)}">
          </div>

          <div
            class="month-bar expense-bar"
            style="height:${expenseHeight}%"
            title="Despesas: ${money(week.expense)}">
          </div>

        </div>

        <span class="month-label">
          ${index + 1}ª sem.
        </span>

      </div>

    `;

  }).join('');

}


// DESPESAS SEPARADAS POR CATEGORIA
function renderCategoryBreakdown(items) {

  const container =
    document.getElementById('categoryBreakdown');

  const expenses =
    items.filter(item => item.type === 'expense');

  const totals = {};


  expenses.forEach(item => {

    totals[item.category] =
      (totals[item.category] || 0) +
      Number(item.amount);

  });


  const sorted =
    Object.entries(totals).sort(
      (a, b) => b[1] - a[1]
    );

  const totalExpenses =
    sorted.reduce(
      (sum, item) => sum + item[1],
      0
    );


  if (sorted.length === 0 || totalExpenses === 0) {

    container.innerHTML = `
      <div class="empty-state">
        <strong>Sem despesas no período</strong>
        <span>As categorias aparecerão quando houver registros.</span>
      </div>
    `;

    return;

  }


  container.innerHTML = sorted.slice(0, 7).map(
    ([category, value]) => {

      const percent =
        (value / totalExpenses) * 100;

      return `

        <div class="category-row">

          <div class="category-row-top">
            <span>${escapeHTML(category)}</span>
            <strong>${money(value)}</strong>
          </div>

          <div class="category-track">

            <div
              class="category-fill"
              style="width:${percent}%">
            </div>

          </div>

        </div>

      `;

    }
  ).join('');

}


// =========================================================
// METAS FINANCEIRAS
// =========================================================

function updateGoal() {

  const savedAmount =
    sumByType(getModeTransactions(), 'saving');

  const target =
    Number(goal.target) || 0;

  const percent = target > 0
    ? Math.min((savedAmount / target) * 100, 100)
    : 0;


  document.getElementById(
    'goalName'
  ).value = goal.name || '';

  document.getElementById(
    'goalTarget'
  ).value = target || '';

  document.getElementById(
    'goalSaved'
  ).textContent = money(savedAmount);

  document.getElementById(
    'goalPercent'
  ).textContent = `${Math.round(percent)}% concluído`;

  document.getElementById(
    'goalProgress'
  ).style.width = `${percent}%`;

}


// =========================================================
// SEGURANÇA DE TEXTO
// =========================================================

// Evita que textos digitados sejam interpretados como HTML.
function escapeHTML(value) {

  return String(value).replace(/[&<>"']/g, character => ({

    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'

  })[character]);

}


// =========================================================
// LISTA DE MOVIMENTAÇÕES
// =========================================================

// Exibe uma lista compacta de registros.
function renderSmallTransactionList(
  elementId,
  items,
  emptyMessage
) {

  const container =
    document.getElementById(elementId);

  const sorted = [...items].sort(
    (a, b) => b.date.localeCompare(a.date)
  );


  if (sorted.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        <strong>${emptyMessage}</strong>
        <span>Os registros aparecerão aqui automaticamente.</span>
      </div>
    `;

    return;

  }


  container.innerHTML = sorted.slice(0, 8).map(item => `

    <div class="transaction-item">

      <div class="transaction-symbol symbol-${item.type}">
        ${typeSymbols[item.type] || '•'}
      </div>

      <div class="transaction-info">

        <strong>
          ${escapeHTML(item.description)}
        </strong>

        <small>
          ${typeNames[item.type] || 'Registro'}
          · ${escapeHTML(item.category)}
          · ${formatDate(item.date)}
        </small>

      </div>

      <div class="transaction-amount amount-${item.type}">
        ${item.type === 'income' ? '+' : '−'}
        ${money(item.amount)}
      </div>

      <div class="transaction-actions">

        <button
          class="edit-button"
          type="button"
          data-edit="${escapeHTML(item.id)}"
          aria-label="Editar ${escapeHTML(item.description)}"
          title="Editar registro">
          ✎
        </button>

        <button
          class="delete-button"
          type="button"
          data-delete="${escapeHTML(item.id)}"
          aria-label="Excluir ${escapeHTML(item.description)}"
          title="Excluir registro">
          ×
        </button>

      </div>

    </div>

  `).join('');

}


// Atualiza o histórico completo.
function renderTransactions() {

  const items = [...getModeTransactions()].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  document.getElementById(
    'transactionCount'
  ).textContent = `${items.length} ${
    items.length === 1 ? 'registro' : 'registros'
  }`;


  if (items.length === 0) {

    transactionList.innerHTML = `

      <div class="empty-state">

        <span class="empty-icon">↗</span>

        <strong>Nenhuma movimentação por aqui</strong>

        <span>
          Adicione seu primeiro registro usando o formulário acima.
        </span>

      </div>

    `;

    return;

  }


  transactionList.innerHTML = items.map(item => `

    <div class="transaction-item">

      <div class="transaction-symbol symbol-${item.type}">
        ${typeSymbols[item.type] || '•'}
      </div>

      <div class="transaction-info">

        <strong>
          ${escapeHTML(item.description)}
        </strong>

        <small>
          ${typeNames[item.type] || 'Registro'}
          · ${escapeHTML(item.category)}
          · ${formatDate(item.date)}
        </small>

      </div>

      <div class="transaction-amount amount-${item.type}">
        ${item.type === 'income' ? '+' : '−'}
        ${money(item.amount)}
      </div>

      <div class="transaction-actions">

        <button
          class="edit-button"
          type="button"
          data-edit="${escapeHTML(item.id)}"
          aria-label="Editar ${escapeHTML(item.description)}"
          title="Editar registro">
          ✎
        </button>

        <button
          class="delete-button"
          type="button"
          data-delete="${escapeHTML(item.id)}"
          aria-label="Excluir ${escapeHTML(item.description)}"
          title="Excluir registro">
          ×
        </button>

      </div>

    </div>

  `).join('');

}


// =========================================================
// ATUALIZAÇÃO GERAL DAS TELAS
// =========================================================

// Atualiza as duas dashboards e o histórico.
function refreshAll() {

  updateWeeklyDashboard();

  updateMonthlyDashboard();

  renderTransactions();

  updateGoal();

}


// =========================================================
// NAVEGAÇÃO
// =========================================================

function openView(viewName) {

  document.querySelectorAll('[data-view-panel]').forEach(section => {

    const isActive =
      section.dataset.viewPanel === viewName;

    section.classList.toggle(
      'active',
      isActive
    );

    section.hidden = !isActive;

  });


  document.querySelectorAll('.nav-link').forEach(button => {

    button.classList.toggle(
      'active',
      button.dataset.view === viewName
    );

  });


  const titles = {

    weekly: 'Visão semanal',
    monthly: 'Dashboard Elite',
    transactions: 'Movimentações',
    planning: 'Planejamento'

  };


  document.getElementById(
    'breadcrumbCurrent'
  ).textContent = titles[viewName] || 'Visão semanal';

}


// =========================================================
// CADASTRO E EDIÇÃO DE MOVIMENTAÇÕES
// =========================================================

form.addEventListener('submit', event => {

  event.preventDefault();

  const description =
    descriptionInput.value.trim();

  const amount =
    Number(amountInput.value);

  const date =
    dateInput.value;


  // Valida os dados.
  if (
    !description ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !date
  ) {

    showToast(
      'Confira a descrição, o valor e a data.'
    );

    return;

  }


  // SE ESTIVER EDITANDO, ATUALIZA O REGISTRO ORIGINAL.
  if (editingTransactionId) {

    const index = transactions.findIndex(item =>
      String(item.id) === editingTransactionId
    );


    if (index === -1) {

      resetTransactionForm();

      showToast(
        'Esse registro não foi encontrado. Atualize a lista e tente novamente.'
      );

      return;

    }


    // Preserva o ID e o ambiente original.
    transactions[index] = {

      ...transactions[index],

      description,
      amount,
      type: typeInput.value,
      category: categoryInput.value,
      date

    };


    saveTransactions();

    resetTransactionForm();

    refreshAll();

    showToast(
      'Alterações salvas. As dashboards foram atualizadas.'
    );

    return;

  }


  // SE NÃO ESTIVER EDITANDO, CRIA UM NOVO REGISTRO.
  const newTransaction = {

    id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,

    mode: currentMode,

    description,

    amount,

    type: typeInput.value,

    category: categoryInput.value,

    date

  };


  transactions.push(newTransaction);

  saveTransactions();

  resetTransactionForm();

  refreshAll();

  showToast(
    'Movimentação adicionada. As dashboards foram atualizadas.'
  );

});


// Atualiza categorias quando o tipo é alterado.
typeInput.addEventListener(
  'change',
  updateCategories
);


// =========================================================
// CANCELAR EDIÇÃO
// =========================================================

document.getElementById(
  'cancelEditButton'
).addEventListener('click', () => {

  resetTransactionForm();

  showToast(
    'Edição cancelada. Nenhum dado foi alterado.'
  );

});


// =========================================================
// ALTERNÂNCIA ENTRE PESSOA FÍSICA E JURÍDICA
// =========================================================

document.querySelectorAll('.mode-button').forEach(button => {

  button.addEventListener('click', () => {

    if (editingTransactionId) {

      resetTransactionForm();

    }

    currentMode = button.dataset.mode;

    localStorage.setItem(
      'contaFacilMode',
      currentMode
    );

    goal = loadGoalForMode(currentMode);


    // Atualiza o botão selecionado.
    document.querySelectorAll('.mode-button').forEach(item => {

      item.classList.toggle(
        'active',
        item.dataset.mode === currentMode
      );

    });


    // Muda os nomes dos indicadores para PF ou PJ.
    const incomeText =
      currentMode === 'pf'
        ? 'RECEITAS'
        : 'FATURAMENTO';

    const expenseText =
      currentMode === 'pf'
        ? 'DESPESAS'
        : 'CUSTOS';


    document.getElementById(
      'weeklyIncomeLabel'
    ).textContent = `${incomeText} DA SEMANA`;

    document.getElementById(
      'weeklyExpenseLabel'
    ).textContent = `${expenseText} DA SEMANA`;

    document.getElementById(
      'monthlyIncomeLabel'
    ).textContent = `${incomeText} DO MÊS`;

    document.getElementById(
      'monthlyExpenseLabel'
    ).textContent = `${expenseText} DO MÊS`;


    updateCategories();

    refreshAll();

    showToast(
      currentMode === 'pf'
        ? 'Ambiente Pessoa Física selecionado.'
        : 'Ambiente Pessoa Jurídica selecionado.'
    );

  });

});


// =========================================================
// MENU DE NAVEGAÇÃO
// =========================================================

document.querySelectorAll('.nav-link').forEach(button => {

  button.addEventListener('click', () => {

    openView(button.dataset.view);

  });

});


document.querySelectorAll('[data-open-view]').forEach(link => {

  link.addEventListener('click', event => {

    event.preventDefault();

    openView(link.dataset.openView);

  });

});


// =========================================================
// NAVEGAÇÃO ENTRE SEMANAS
// =========================================================

document.getElementById(
  'previousWeek'
).addEventListener('click', () => {

  selectedWeekOffset--;

  updateWeeklyDashboard();

});


document.getElementById(
  'nextWeek'
).addEventListener('click', () => {

  selectedWeekOffset++;

  updateWeeklyDashboard();

});


document.getElementById(
  'currentWeek'
).addEventListener('click', () => {

  selectedWeekOffset = 0;

  updateWeeklyDashboard();

});


// =========================================================
// SELEÇÃO DO MÊS
// =========================================================

document.getElementById(
  'monthPicker'
).addEventListener('change', event => {

  if (!event.target.value) return;

  selectedMonth = event.target.value;

  updateMonthlyDashboard();

});


// =========================================================
// BOTÕES DE EDIÇÃO E EXCLUSÃO
// =========================================================

// Funcionam tanto na lista semanal quanto no histórico completo.
transactionList.addEventListener(
  'click',
  handleTransactionActions
);

document.getElementById(
  'weeklyTransactions'
).addEventListener(
  'click',
  handleTransactionActions
);


// =========================================================
// SALVAR META FINANCEIRA
// =========================================================

document.getElementById(
  'saveGoalButton'
).addEventListener('click', () => {

  const name =
    document.getElementById('goalName').value.trim();

  const target =
    Number(document.getElementById('goalTarget').value);


  if (
    !name ||
    !Number.isFinite(target) ||
    target <= 0
  ) {

    showToast(
      'Informe o nome e um valor válido para a meta.'
    );

    return;

  }


  goal = {
    name,
    target
  };

  saveGoalForMode(
    currentMode,
    goal
  );

  showToast('Meta salva com sucesso.');

});


// =========================================================
// EXPORTAÇÃO CSV
// =========================================================

document.getElementById(
  'exportButton'
).addEventListener('click', () => {

  const items =
    getModeTransactions();


  if (items.length === 0) {

    showToast(
      'Não existem registros para exportar.'
    );

    return;

  }


  const rows = [

    [
      'Descrição',
      'Tipo',
      'Categoria',
      'Valor',
      'Data',
      'Ambiente'
    ],

    ...items.map(item => [

      item.description,

      typeNames[item.type] || item.type,

      item.category,

      Number(item.amount).toFixed(2),

      item.date,

      item.mode.toUpperCase()

    ])

  ];


  // Formata os dados no padrão CSV.
  const csv = rows.map(row =>

    row.map(value =>

      `"${String(value).replace(/"/g, '""')}"`

    ).join(';')

  ).join('\n');


  const blob = new Blob(
    ['\uFEFF' + csv],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;

  link.download =
    `conta-facil-${currentMode}-${todayISO()}.csv`;

  link.click();

  URL.revokeObjectURL(url);

  showToast('Arquivo CSV exportado.');

});


// =========================================================
// INICIALIZAÇÃO DO SISTEMA
// =========================================================

// Configura a data atual.
document.getElementById(
  'todayLabel'
).textContent = new Date().toLocaleDateString(
  'pt-BR',
  {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }
);


// Configura mês e data do formulário.
document.getElementById(
  'monthPicker'
).value = selectedMonth;

dateInput.value = todayISO();


// Marca o ambiente salvo.
document.querySelectorAll('.mode-button').forEach(button => {

  button.classList.toggle(
    'active',
    button.dataset.mode === currentMode
  );

});


// Atualiza os nomes iniciais dos indicadores.
const initialIncomeText =
  currentMode === 'pf'
    ? 'RECEITAS'
    : 'FATURAMENTO';

const initialExpenseText =
  currentMode === 'pf'
    ? 'DESPESAS'
    : 'CUSTOS';


document.getElementById(
  'weeklyIncomeLabel'
).textContent = `${initialIncomeText} DA SEMANA`;

document.getElementById(
  'weeklyExpenseLabel'
).textContent = `${initialExpenseText} DA SEMANA`;

document.getElementById(
  'monthlyIncomeLabel'
).textContent = `${initialIncomeText} DO MÊS`;

document.getElementById(
  'monthlyExpenseLabel'
).textContent = `${initialExpenseText} DO MÊS`;


// Inicia o sistema.
updateCategories();

refreshAll();

openView('weekly');